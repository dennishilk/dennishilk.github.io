# Sources for Snakkie’s input phrases

`utterances.json` contains selected user phrases grouped by Snakkie’s reply
routes and by upstream source. The collection removes duplicates across sources
within each route. Capitalization, punctuation and accents are normalized when
matching. Snakkie’s response text is written separately.

- **ChatterBot Corpus**, Gunther Cox and contributors. Selected German and
  English inputs from `greetings.yml` and `conversations.yml` at
  [eec45b2](https://github.com/gunthercox/chatterbot-corpus/tree/eec45b284424c9784a5baab78368b1a9ff3b656f).
  [BSD 3-Clause license](chatterbot-license.txt).
- **MASSIVE 1.1**, Amazon.com Inc. or its affiliates. Selected `de-DE` and
  `en-US` phrases for greetings, jokes, time, date and weather.
  [Dataset and documentation](https://github.com/alexa/massive).
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). MASSIVE includes
  material from [SLURP](https://github.com/pswietojanski/slurp), also CC BY 4.0.
  See the [upstream notice](https://github.com/alexa/massive/blob/main/NOTICE.md).
- **NLU Evaluation Data – English and German**, Philip May, Deutsche Telekom,
  and the [original dataset authors](https://github.com/xliuhw/NLU-Evaluation-Data).
  Selected English originals and German translations for greetings, jokes,
  praise, corrections and follow-ups.
  [Dataset and attribution](https://huggingface.co/datasets/deutsche-telekom/NLU-Evaluation-Data-en-de/tree/d42ae75).
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

The source inputs were reviewed for the functions Snakkie can actually perform.
They are matched as whole phrases. Direct factual answers in `facts.json`
carry their own sources.
