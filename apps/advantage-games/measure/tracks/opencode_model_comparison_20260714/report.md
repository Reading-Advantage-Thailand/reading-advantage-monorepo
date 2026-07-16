# OpenCode Model Comparison

Snapshot: 2026-07-14

OpenCode version: `1.17.20`

## Inventory

The following IDs were observed from `opencode models`.

### Subscription-oriented namespaces

These namespaces are treated as plan-backed in this local OpenCode setup. The namespace identifies the access route, not an independently verified provider billing statement.

#### Volcengine Coding Plan (`vocengine-coding`)

- `vocengine-coding/ark-code-latest`
- `vocengine-coding/deepseek-v4-flash`
- `vocengine-coding/deepseek-v4-pro`
- `vocengine-coding/doubao-seed-2.0-code`
- `vocengine-coding/doubao-seed-2.0-lite`
- `vocengine-coding/doubao-seed-2.0-pro`
- `vocengine-coding/glm-5.1`
- `vocengine-coding/glm-5.2`
- `vocengine-coding/minimax-m3`

#### MiniMax Coding Plan (`minimax-cn-coding-plan`)

- `minimax-cn-coding-plan/MiniMax-M2`
- `minimax-cn-coding-plan/MiniMax-M2.1`
- `minimax-cn-coding-plan/MiniMax-M2.5`
- `minimax-cn-coding-plan/MiniMax-M2.5-highspeed`
- `minimax-cn-coding-plan/MiniMax-M2.7`
- `minimax-cn-coding-plan/MiniMax-M2.7-highspeed`
- `minimax-cn-coding-plan/MiniMax-M3`

#### OpenAI (`openai`)

- `openai/gpt-5.3-codex-spark`
- `openai/gpt-5.4`
- `openai/gpt-5.4-fast`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-mini-fast`
- `openai/gpt-5.5`
- `openai/gpt-5.5-fast`
- `openai/gpt-5.6-luna`
- `openai/gpt-5.6-luna-fast`
- `openai/gpt-5.6-sol`
- `openai/gpt-5.6-sol-fast`
- `openai/gpt-5.6-terra`
- `openai/gpt-5.6-terra-fast`

### Direct low-cost API namespaces

#### Xiaomi

- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `xiaomi/mimo-v2.5-pro-ultraspeed`

#### DeepSeek

- `deepseek/deepseek-chat`
- `deepseek/deepseek-reasoner`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`

#### MiniMax standard API namespace

The non-plan namespace is also present and should be treated as a separate access route from the coding plan:

- `minimax-cn/MiniMax-M2`
- `minimax-cn/MiniMax-M2.1`
- `minimax-cn/MiniMax-M2.5`
- `minimax-cn/MiniMax-M2.5-highspeed`
- `minimax-cn/MiniMax-M2.7`
- `minimax-cn/MiniMax-M2.7-highspeed`
- `minimax-cn/MiniMax-M3`

## Evidence Table

Artificial Analysis values are a public cross-provider snapshot gathered 2026-07-14. Prices are API-equivalent input/output USD per one million tokens and must not be read as subscription fees. “AA” is an independent benchmark index, not a coding-task score.

| Model family | AA intelligence / reasoning result | AA speed | API price in / out | Reasoning control | Local benchmark |
|---|---:|---:|---:|---|---:|
| GPT-5.6 Sol | 56 high, 58 xhigh, 59 max | 67.6 / 68.3 / 69.0 tok/s | $5 / $30 | `high`, `xhigh`, `max` documented | Not measured |
| GPT-5.6 Terra | 49 high | 122.0 tok/s | $2.50 / $15 | `high` documented | Not measured |
| GPT-5.6 Luna | 46 high, 51 max | 204.4 / 219.2 tok/s | $1 / $6 | Model-specific effort levels | Not measured |
| GLM-5.2 | 51 max | 194.7 tok/s | $1.40 / $4.40 | `max` in benchmark view | GLM-5.1 alias: 95.5 average |
| MiniMax-M3 | 44 | 107.3 tok/s | $0.30 / $1.20 | Thinking/non-thinking; no graded scale verified | 95.5 average |
| MiMo-V2.5-Pro | 42 | 58.4 tok/s | $0.435 / $0.87 | Reasoning model; graded scale not verified | 96.5 average |
| DeepSeek V4 Pro | 44 max | 68.1 tok/s | $0.435 / $0.87 | Thinking mode and effort control documented | 96.5 average |
| DeepSeek V4 Flash | 40 max | 103.4 tok/s | $0.14 / $0.28 | Thinking mode and effort control documented | Not measured |
| MiniMax-M2.7 | 38 | 60.7 tok/s | $0.30 / $1.20 | Reasoning model; graded scale not verified | Not measured |

The GLM-5.2 row is a model-family proxy. It is not proof that `vocengine-coding/glm-5.2` produces the same result as the Artificial Analysis provider/configuration.

## Internal Benchmark

Source: `reading-advantage-llm-benchmark/docs/manual-opencode-comparison-20260601.md`.

The benchmark used two independent OpenCode web-app API tasks, with functional, integration, regression, minimality, and process scoring. It is directional evidence, not a statistically robust leaderboard.

| Local rank | Exact OpenCode ID | Average | Wall time |
|---:|---|---:|---:|
| 1 | `xiaomi/mimo-v2.5-pro` | 96.5 | 323.9s |
| 2 | `opencode-go/deepseek-v4-pro` | 96.5 | 1279.4s |
| 3 | `minimax-cn-coding-plan/MiniMax-M3` | 95.5 | 777.7s |
| 4 | `vocengine-coding/glm-5.1` | 95.5 | 1104.2s |

The two tasks were adding `datasetVersion` filtering to `GET /api/runs` and adding a combined `status` filter to `GET /api/tasks`. The benchmark report states that every run had verification artifacts, but only two tasks and one run per model were used.

## Reasoning Controls

| Provider | Verified behavior | Comparability note |
|---|---|---|
| OpenAI | The reasoning API exposes model-dependent effort settings; the evaluated aliases expose `high`, `xhigh`, and/or `max` in the public benchmark view. | `fast` aliases should be treated as routing/speed variants until separately measured, not as reasoning levels. |
| DeepSeek | Thinking mode can be enabled or disabled, with documented effort control for supported models. | `deepseek-chat` and `deepseek-reasoner` are legacy aliases scheduled for V4 alias migration on 2026-07-24 according to the current pricing documentation. |
| MiniMax | M3 supports thinking and non-thinking modes; highspeed models are presented as faster variants. | No reliable public low/medium/high effort scale was verified. |
| Xiaomi | MiMo-V2.5-Pro is documented and benchmarked as a reasoning model. | No reliable first-party graded effort scale was verified in this pass. |
| Volcengine | The provider exposes coding-plan model aliases and a deep-thinking path. | The JavaScript-only documentation pages prevented reliable extraction of exact effort parameters and per-alias benchmark data. |

## Recommendations

1. Use `minimax-cn-coding-plan/MiniMax-M3` as the strongest low-cost subscription default for general coding. It combines a strong local score with low public API-equivalent pricing.
2. Use `xiaomi/mimo-v2.5-pro` when local task quality and latency matter. It tied for the best local score and was substantially faster than the local DeepSeek run.
3. Use `deepseek/deepseek-v4-flash` for cost-sensitive throughput. Its public price is the lowest in this comparison, but it still needs a local task run before being preferred for correctness-critical work.
4. Use `deepseek/deepseek-v4-pro` when deeper reasoning is worth the latency and cost. Its local score was strong, but the measured run was slow.
5. Use GPT-5.6 Sol for highest public benchmark capability when cost is secondary. Use Terra or Luna when the workload needs a better speed/cost tradeoff.
6. Treat `vocengine-coding/glm-5.2`, Doubao, and `ark-code-latest` as candidates requiring direct local evaluation. Public family-level numbers are not sufficient to rank the exact Volcengine aliases.

## Evidence Gaps and Next Evaluation

- Public benchmark scores are not equivalent to the internal two-task score.
- API prices do not describe flat-rate subscription economics.
- Exact provider adapters, context windows, hidden system prompts, and routing behavior may change results.
- The current local benchmark has one run per model and only two tasks.
- Run 10-20 representative repository tasks across three difficulty tiers, with three repeats per model/configuration.
- Record exact model ID, reasoning setting, elapsed time, input/output tokens, effective cost, tests, build result, failure mode, and diff size.
- Compare reasoning settings within the same model family before comparing providers.

## Sources

- OpenCode inventory: local `opencode models`, OpenCode `1.17.20`, 2026-07-14.
- Internal benchmark: `/home/daniel-bo/Desktop/reading-advantage-llm-benchmark/docs/manual-opencode-comparison-20260601.md`.
- OpenAI reasoning guide: `https://platform.openai.com/docs/guides/reasoning`.
- OpenAI models and pricing: `https://platform.openai.com/docs/models`.
- DeepSeek thinking mode: `https://api-docs.deepseek.com/guides/thinking_mode`.
- DeepSeek pricing and aliases: `https://api-docs.deepseek.com/quick_start/pricing`.
- MiniMax model documentation: `https://platform.minimaxi.com/docs/llms.txt`.
- Xiaomi MiMo repository: `https://github.com/XiaomiMiMo/MiMo`.
- Artificial Analysis methodology: `https://artificialanalysis.ai/methodology`.
