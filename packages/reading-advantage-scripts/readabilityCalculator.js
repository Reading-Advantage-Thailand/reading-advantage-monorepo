const axios = require('axios');
const { round } = require('lodash');

async function calculateReadabilityIndex(sentenceCount, wordCount, characterCount) {
    try {
        const { automatedReadability } = await import('automated-readability');

        const counts = {
            sentence: sentenceCount,
            word: wordCount,
            character: characterCount,
        };

        const readabilityIndex = automatedReadability(counts);
        return readabilityIndex;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function calculateArticleStats(article) {
    // Remove all double new lines
    // let cleanedArticle = article.replace(/\n\n/g, '');
    // cleanedArticle = article.replace(/\s+/g, ' ');
    const sentenceCount = (article.match(/[.!?]+/g) || []).length;
    const wordCount = article.split(/\s+/).length;
    const characterCount = article.length;
    // console.log('cleanedArticle:', cleanedArticle);
    // console.log('sentenceCount:', sentenceCount);
    // console.log('wordCount:', wordCount);

    return { sentenceCount, wordCount, characterCount };
}

async function fetchCEFRScores(article) {
    // const { cleanedArticle } = calculateArticleStats(article);

    try {
        const response = await axios.post('https://cefr-english-predictor-api-hxamzdhgwa-et.a.run.app/predict', {
            texts: [article],
        });
        console.log('CEFR scores:', response.data[0].scores)

        return response.data[0];
    } catch (error) {
        console.error('Error fetching CEFR scores:', error);
        return null;
    }
}

function calculateReadabilityLevel(ari, scores) {
    const a1 = scores.A1;
    const a2 = scores.A2;
    const b1 = scores.B1;
    const b2 = scores.B2;
    const c1 = scores.C1;
    const c2 = scores.C2;

    const weightedAverage = ((25 * a1) + (35 * a2) + (50 * b1) + (65 * b2) + (75 * c1) + (85 * c2));
    const level = 0.3 * (20 + 5 * ari) + 0.7 * weightedAverage;
    const raLevel = (level - 40) * 70 / 60 + 20
    //math round using int
    let round = Math.round(raLevel);
    return round;
    // console.log('weightedAverage:', weightedAverage);
    // console.log('ari:', ari);
}

module.exports = {
    calculateReadabilityIndex,
    calculateArticleStats,
    fetchCEFRScores,
    calculateReadabilityLevel,
};
