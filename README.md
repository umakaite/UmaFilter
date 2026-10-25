# UmaFilter: https://umakaite.github.io/UmaFilter/

I barely know how to code, but here we go!

Fork of UmaFlagger to update it with new lists of filtering rules and filtered terms. Please submit bugs if you find any!

Credits:

- Original chat filter detector idea, initial script, and webpage: https://github.com/arcionek/UmaFlagger

- uma_filter_rules.json source: https://github.com/ayaliz

- unicode-case-folding.js: https://github.com/avivkeller/unicode-case-folding

TODO: halfwidth_katakana_fold isn't fully accurate using String.normalize("NFKC")

- For example: ﾜｷﾞﾅ -> ワギナ != ワギナ (U+30EF **U+30AD U+3099** U+30CA vs U+30EF **U+30AE** U+30CA)