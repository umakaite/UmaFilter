const DIRECT = UMA_FILTER_RULES.rules.direct;
const LITERAL_PHRASE = UMA_FILTER_RULES.rules.literal_phrase;
const EITHER_SIDE = UMA_FILTER_RULES.rules.space_context.either_side;
const LEFT_SIDE = UMA_FILTER_RULES.rules.space_context.left_side;
const BOTH_SIDES = UMA_FILTER_RULES.rules.space_context.both_sides;
const REMOVE_FOR_DIRECT = UMA_FILTER_RULES.normalization.direct_matching.ignored_code_points_after_shared_transforms;

const input = document.getElementById("input");
const output = document.getElementById("output");

function findOffenses(text) {
  const offenses = [];

  // Normalize text according to rules
  let normalized = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // fullwidth_ascii_fold
    if (ch.charCodeAt(0) >= 0xFF01 && ch.charCodeAt(0) <= 0xFF5E) {
      normalized += String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    }
    // halfwidth_katakana_fold
    else if (ch.charCodeAt(0) >= 0xFF61 && ch.charCodeAt(0) <= 0xFF9F) {
      normalized += ch.normalize("NFKC");
    }
    // ideographic_space_fold
    else if (ch.charCodeAt(0) === 0x3000) {
      normalized += " ";
    }
    // unicode_casefold
    else {
    normalized += caseFold(ch);
    // normalized += ch.toLowerCase();
    }
  }

  // Remove characters for direct matching and create an index map
  const indexMap = []; // direct match index -> original index
  let normalizedDirect = "";
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (!REMOVE_FOR_DIRECT.includes(ch.charCodeAt(0))) {
    normalizedDirect += ch;
    indexMap.push(i);
    }
  }

  function expandSpaces(start, end) {
    while (start > 0 && text[start - 1] === " ") start--;
    while (end < text.length - 1 && text[end + 1] === " ") end++;
    return [start, end];
  }

  function checkRepeatOffense(start, end)
  {
    let checkStart = expandSpaces(start, end)[0];
    let checkEnd = expandSpaces(start, end)[1];
    // console.log(offenses.some(e=>e[0] === check));
    return offenses.some(e=>e[0] === checkStart || e[1] === checkEnd);
  }

  // direct_matching
  // After shared transforms, remove only the listed code points and perform substring matching against direct rules.
  DIRECT.forEach(word => {
    let idx = normalizedDirect.indexOf(word);
    while (idx !== -1) {
      let start = indexMap[idx];
      let end = indexMap[idx + word.length - 1];
      if (!checkRepeatOffense(start, end)) {
        offenses.push(expandSpaces(start, end));
      }
      idx = normalizedDirect.indexOf(word, idx + 1);
    }
  });

  // literal_phrase_matching (there's only 1 term listed and I guess Cygames hates Marine Le Pen???)
  // Apply shared transforms only, then perform a literal substring search. Do not remove punctuation or spaces.
  // U+0020 and folded U+3000 are equivalent. One space in the rule matches exactly one; repeated spaces do not collapse.
  LITERAL_PHRASE.forEach(word => {
    let idx = normalized.indexOf(word);
    while (idx !== -1) {
      let start = idx;
      let end = idx + word.length - 1;

      if (!checkRepeatOffense(start, end)) {
        offenses.push(expandSpaces(start, end));
      }

      idx = normalized.indexOf(word, idx + 1);
    }
  });
  
  // space_context_matching
  // Apply shared transforms only. Find the literal pattern and inspect its immediately adjacent characters for U+0020.
  // ASCII U+0020 and folded U+3000 count as spaces. Comment start/end, tabs, NBSP, thin spaces, punctuation, and dashes do not count as spaces.

  // either_side
  //Requires a space immediately before or after the pattern, or both.
  EITHER_SIDE.forEach(word => {
    let idx = normalized.indexOf(word);
    while (idx !== -1) {
      let start = idx;
      let end = idx + word.length - 1;

      const hasSpaceBefore = start > 0 && normalized[start - 1] === " ";
      const hasSpaceAfter = end < normalized.length - 1 && normalized[end + 1] === " ";

      if ((hasSpaceBefore || hasSpaceAfter) && !checkRepeatOffense(start)) {
        offenses.push(expandSpaces(start, end));
      }

      idx = normalized.indexOf(word, idx + 1);
    }
  });
	
  // left_side
  //Requires a space immediately before the pattern; the right side is unrestricted.
  LEFT_SIDE.forEach(word => {
    let idx = normalized.indexOf(word);
    while (idx !== -1) {
      let start = idx;
      let end = idx + word.length - 1;

      const hasSpaceBefore = start > 0 && normalized[start - 1] === " ";

      if (hasSpaceBefore && !checkRepeatOffense(start)) {
        offenses.push(expandSpaces(start, end));
      }

      idx = normalized.indexOf(word, idx + 1);
    }
  });
	
  // both_sides
  // Requires spaces immediately before and after the pattern.
  BOTH_SIDES.forEach(word => {
    let idx = normalized.indexOf(word);
    while (idx !== -1) {
      let start = idx;
      let end = idx + word.length - 1;

      const hasSpaceBefore = start > 0 && normalized[start - 1] === " ";
      const hasSpaceAfter = end < normalized.length - 1 && normalized[end + 1] === " ";

      if (hasSpaceBefore && hasSpaceAfter && !checkRepeatOffense(start)) {
        offenses.push(expandSpaces(start, end));
      }

      idx = normalized.indexOf(word, idx + 1);
    }
  });

  console.log(normalized);
  console.log(normalizedDirect);
  console.log(offenses);
  return offenses;
}

function highlight(text, ranges) {
  if (ranges.length === 0) return escapeHTML(text);

  ranges.sort((a, b) => a[0] - b[0]);

  let result = "";
  let lastIndex = 0;

  for (const [start, end, title] of ranges) {
    result += escapeHTML(text.slice(lastIndex, start));
	if(title){
	  result += `<mark style="background: #ff8888!important" title="${title}">`
	}
	else{
      result += `<mark>`;
	}
	result += `${escapeHTML(text.slice(start, end + 1))}</mark>`
    lastIndex = end + 1;
  }

  result += escapeHTML(text.slice(lastIndex));
  return result;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

input.addEventListener("input", () => {
  const text = input.value;
  const offenses = findOffenses(text);
  output.innerHTML = highlight(text, offenses);
});
