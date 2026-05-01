// generate question

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
console.log('apiKey:', process.env.OPENAI_API_KEY);
const openai = new OpenAIApi(configuration);

async function generateQuestion(articleContent, articleDescription) {

    const articleDescriptionString = JSON.stringify(articleDescription);

    const prompt = `You are going to act as an expert language proficiency evaluator. I will give you an article text and some descriptors of the desired proficiency level of the reader. You will write four multiple choice questions and one short-answer, open-ended question that can be used to evaluate whether the reader meets the desired proficiency level or not. You do not need to evaluate the reader on these exact descriptors: take them as a guide to the desired proficiency and write questions to that proficiency level. for each question, provide the ID of the descriptor it tests and a suggested answer.
    Article: ${articleContent}
    Descriptors in json format:
    ${articleDescriptionString}`;
    // console.log('prompt:', prompt);
    const schema = {
        type: 'object',
        properties: {
            multiple_choice_questions: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        question: {
                            type: 'string',
                            description: 'A question that can be used to evaluate whether the reader meets the desired proficiency level or not',
                        },
                        descriptor_id: {
                            type: 'string',
                            description: 'The ID of the descriptor that the question tests',
                        },
                        'answers': {
                            type: 'object',
                            description: 'The possible answers to the question in multiple choice format. The first answer is the correct answer.',
                            properties: {
                                correct_answer_a: {
                                    type: 'string',
                                    description: 'The correct response.',
                                },
                                answer_b: {
                                    type: 'string',
                                },
                                answer_c: {
                                    type: 'string',
                                },
                                answer_d: {
                                    type: 'string',
                                },
                                suggested_answer: {
                                    type: 'string',
                                    description: 'A suggested answer to the letter of the correct answer for multiple choice.',
                                },
                            },
                        },
                    },
                },
            },
            short_answer_question: {
                type: 'object',
                properties: {
                    question: {
                        type: 'string',
                        description: 'A question that can be used to evaluate whether the reader meets the desired proficiency level or not',
                    },
                    suggested_answer: {
                        type: 'string',
                        description: 'A suggested answer to the the short-answer question.',
                    },
                },
            },
        },
        required: [
            'multiple_choice_questions',
            'short_answer_question',
        ],
    };

    const res = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
            {
                "role": "system",
                "content": "You are an expert language proficiency evaluator.",
            },
            {
                "role": "user",
                "content": prompt,
            }
        ],
        functions: [
            {
                "name": 'get_question',
                "parameters": schema,
            },
        ],
        function_call: {
            name: 'get_question',
        },
    });
    const result = JSON.parse(res.data.choices[0].message.function_call.arguments);
    return result;
};
// main
async function main() {
    const articleFilePath = path.join(__dirname, '../data/articles_firestore.json');
    const discriminatorFilePath = path.join(__dirname, '../data/combined.json');

    // read article and get raLevel
    const article = JSON.parse(fs.readFileSync(articleFilePath));
    const discriminator = JSON.parse(fs.readFileSync(discriminatorFilePath));

    const results = [];
    let errorCount = 0;
    let nullError = 0;
    let successCount = 0;
    const errorArticles = [];

    for (let i = 206; i < article.length; i++) {
        console.log('i:', i);
        console.log('errorCount:', errorCount);
        console.log('nullError:', nullError);
        console.log('successCount:', successCount);


        const raLevel = article[i].raLevel;
        if (raLevel === null || raLevel === undefined) {
            nullError++;
            errorArticles.push(article[i]);
            fs.writeFileSync('../data/errorArticles.json', JSON.stringify(errorArticles, null, 2));
            continue;
        }

        // get descriptors where raLevel = GSE in discriminator and lower than raLevel -1
        // console.log('article:', article[i]);
        const raDescriptors = discriminator.filter((item) => item.GSE === raLevel.toString() || item.GSE === (raLevel - 1).toString());
        // const raDescriptors = discriminator.filter((item) => item.GSE === raLevel.toString());
        console.log('article raLevel:', article[i].raLevel);
        // log gse descriptors level
        for (let j = 0; j < raDescriptors.length; j++) {
            console.log('raDescriptors:', raDescriptors[j].GSE);
        }

        // combine descriptors 
        const combinedDescriptors = [];
        for (let j = 0; j < raDescriptors.length; j++) {
            const descriptor = raDescriptors[j].descriptors;
            for (let k = 0; k < descriptor.length; k++) {
                combinedDescriptors.push(descriptor[k]);
            }
        }
        // fs.writeFileSync('../data/raDescriptors.json', JSON.stringify(combinedDescriptors, null, 2));
        // generate question
        const articleContent = article[i].content;
        try {
            const result = await generateQuestion(articleContent, combinedDescriptors);
            const articleResult = {
                "docId": article[i].docId,
                "title": article[i].title,
                "content": article[i].content,
                "type": article[i].type,
                "genre": article[i].genre,
                "subGenre": article[i].subGenre,
                "topic": article[i].topic,
                "grade": article[i].grade,
                "ari": article[i].ari,
                "cefrScores": article[i].cefrScores,
                "raLevel": article[i].raLevel,
                "questions": result,
            }

            results.push(articleResult);

            //write array to file
            fs.writeFileSync('../data/generatedQuestion3.json', JSON.stringify(results, null, 2));
            successCount++;

        } catch (error) {
            errorCount++;
            i--;
            continue;
        }
    }

    // const articleContent = "Once upon a time, in a small village, there were two friends named Lily and Jack. They loved to explore the forest near their village. One sunny day, while they were walking in the forest, they heard a strange noise. They followed the sound and stumbled upon a hidden land. To their surprise, all the animals in this land could talk! The animals were in trouble because a big storm was coming. Lily and Jack decided to help the animals. They went to the wise owl for advice. The owl told them that they needed to find a magical stone to stop the storm. Lily and Jack searched the land, and finally, they found the stone. They placed the stone in the center of the land, and it started to glow. The storm stopped, and the animals were safe. The animals were grateful to Lily and Jack for their help. From that day on, Lily and Jack became the heroes of the hidden land of talking animals.";
    // const raDescriptors = [
    //     {
    //         "id": "25.AR.11",
    //         "desc": "Can understand short, simple descriptions of objects, people and animals, given visual support."
    //     },
    //     {
    //         "id": "25.YL.43",
    //         "desc": "Can distinguish between a negative statement and a positive statement."
    //     },
    //     {
    //         "id": "25.YL.44",
    //         "desc": "Can recognise words or phrases that are repeated in a short text or poem."
    //     },
    //     {
    //         "id": "25.YL.45",
    //         "desc": "Can identify individual sounds within simple words."
    //     },
    //     {
    //         "id": "25.YL.46",
    //         "desc": "Can understand simple sentences about the weather, if supported by pictures."
    //     },
    //     {
    //         "id": "25.YL.47",
    //         "desc": "Can understand a few simple phrases related to familiar, everyday activities."
    //     },
    //     {
    //         "id": "25.YL.48",
    //         "desc": "Can understand a simple text if supported by pictures."
    //     },
    //     {
    //         "id": "25.W.25",
    //         "desc": "Can write cardinal numbers up to twenty as words."
    //     },
    //     {
    //         "id": "25.W.26",
    //         "desc": "Can write dates using numbers and words."
    //     },
    //     {
    //         "id": "25.W.27",
    //         "desc": "Can list simple information (e.g. names, numbers, prices) from short illustrated texts on familiar topics."
    //     },
    //     {
    //         "id": "26.AR.12",
    //         "desc": "Can follow short, simple written directions (e.g. to go from X to Y)."
    //     },
    //     {
    //         "id": "26.YL.49",
    //         "desc": "Can understand basic sentences about things people have, if supported by pictures."
    //     },
    //     {
    //         "id": "26.YL.50",
    //         "desc": "Can understand basic information about people's likes and dislikes, if supported by pictures."
    //     },
    //     {
    //         "id": "26.YL.51",
    //         "desc": "Can link letters and sounds when reading words."
    //     },
    //     {
    //         "id": "26.YL.52",
    //         "desc": "Can identify repeated words or phrases in a short text."
    //     },
    //     {
    //         "id": "26.YL.53",
    //         "desc": "Can understand basic sentences describing someone's physical appearance, (e.g. eye/hair colour, height), if supported by pictures."
    //     },
    //     {
    //         "id": "26.YL.54",
    //         "desc": "Can follow simple dialogues in short illustrated stories, if they can listen while reading."
    //     },
    //     {
    //         "id": "26.W.28",
    //         "desc": "Can write a few basic sentences introducing themselves and giving basic personal information, given prompts or a model."
    //     },
    //     {
    //         "id": "26.W.29",
    //         "desc": "Can use an apostrophe when writing contractions (e.g. 'I'm', 'We're')."
    //     }
    // ];
    // const result = await generateQuestion(articleContent, raDescriptors);

    // console.log('result:', result);
    // // write result to file
    // const filePath = path.join(__dirname, '../data/generatedQuestion.json');
    // fs.writeFileSync(filePath, JSON.stringify(result, null, 2));



}

main();
