const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
    generateArticle,
    generateArticles,
} = require('./generateArticle');

test('loads and returns one structured article through the installed client interface', async () => {
    const client = {
        chat: {
            completions: {
                create: async () => ({
                    choices: [{
                        message: {
                            function_call: {
                                arguments: JSON.stringify({
                                    title: 'A Test Article',
                                    content: 'First line.\nSecond line.',
                                }),
                            },
                        },
                    }],
                }),
            },
        },
    };

    const article = await generateArticle(
        'Nonfiction',
        'Science',
        'Biology',
        'Cells',
        4,
        client,
    );

    assert.deepEqual(article, {
        title: 'A Test Article',
        content: 'First line. Second line.',
        grade: 4,
    });
});

test('bounds retries and surfaces provider failure', async () => {
    let attempts = 0;
    const generate = async () => {
        attempts++;
        throw new Error('provider unavailable');
    };

    await assert.rejects(
        generateArticles(
            'Nonfiction',
            'Science',
            'Biology',
            'Cells',
            1,
            4,
            7,
            generate,
        ),
        /provider unavailable/,
    );

    assert.equal(attempts, 3);
});

test('rejects a malformed structured response', async () => {
    const client = {
        chat: {
            completions: {
                create: async () => ({
                    choices: [{
                        message: {
                            function_call: { arguments: 'null' },
                        },
                    }],
                }),
            },
        },
    };

    await assert.rejects(
        generateArticle(
            'Nonfiction',
            'Science',
            'Biology',
            'Cells',
            4,
            client,
        ),
        /invalid article/,
    );
});
