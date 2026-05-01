import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { articleService } from "@/server/services/firestore-server-services";
import { evaluateRating } from "../generators/evaluate-rating-generator";

export async function evaluateLevelRunner(
    req: NextRequest,
    params: unknown,
    next: () => void
) {
    const articles = await articleService.articles.getAllDocs();
    const total = articles.length;
    let count = 0;
    const evaluated = await Promise.all(
        articles.map(async (article) => {
            const rating = await evaluateRating({
                type: article.type,
                genre: article.genre,
                subgenre: article.subgenre,
                cefrLevel: article.cefr_level,
                title: article.title,
                summary: article.summary,
                passage: article.passage,
                image_description: article.image_description,
            });
            // update the article with the new rating
            await articleService.articles.updateDoc(article.id, { average_rating: rating.rating });
            count++;
            console.log('id:', article.id, 'rating:', rating.rating, 'cefrLevel:', article.cefr_level, 'total:', count, '/', total);
            return { evaluated: rating.rating, id: article.id, cefrLevel: article.cefr_level };
        })
    );

    // Filter articles rated lower than 3 (rating is between 1 and 5)
    const filteredArticles = evaluated.length > 0 ? evaluated.filter((article) => article.evaluated <= 2) : [];

    // Calculate stats of each rating in each level
    // e.g. { A2: { total: 5, ratings: { 1: 2, 2: 3 }, average: 1.5 } }
    const stats = evaluated.reduce((acc: any, article) => {
        if (!acc[article.cefrLevel]) {
            acc[article.cefrLevel] = { total: 0, ratings: {}, average: 0, sumRatings: 0 };
        }
        acc[article.cefrLevel].total += 1;
        acc[article.cefrLevel].ratings[article.evaluated] = (acc[article.cefrLevel].ratings[article.evaluated] || 0) + 1;
        acc[article.cefrLevel].sumRatings += article.evaluated;
        acc[article.cefrLevel].average = acc[article.cefrLevel].sumRatings / acc[article.cefrLevel].total;
        return acc;
    }, {});

    // Remove the sumRatings property from the final output
    Object.values(stats).forEach((level: any) => {
        delete level.sumRatings;
    });

    // write json
    fs.writeFileSync('./stats.json', JSON.stringify({
        stats,
        articles: filteredArticles,
    }, null, 2));

    return NextResponse.json({
        stats,
        articles: filteredArticles,
    });
}
