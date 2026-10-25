const direct = umaFilterRules.rules.direct;
const literalPhrase = umaFilterRules.rules.literal_phrase;
const eitherSide = umaFilterRules.rules.space_context.either_side;
const leftSide = umaFilterRules.rules.space_context.left_side;
const bothSides = umaFilterRules.rules.space_context.both_sides;
const removeForDirect = umaFilterRules.normalization.direct_matching.ignored_code_points_after_shared_transforms;

const input = document.getElementById("input");
const output = document.getElementById("output");

function findOffenses(text, removeForDirect, direct, literalPhrase, eitherSide, leftSide, bothSides) {
  const offenses = [];

  // Build alphanumeric-only normalized string
  let normalized = "";
  const indexMap = []; // normalized index -> original index

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    // fullwidth_ascii_fold
    if (ch.charCodeAt(0) >= 0xFF01 && ch.charCodeAt(0) <= 0xFF5E) {
      ch = String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    }
    // halfwidth_katakana_fold
    // ???
    // ideographic_space_fold
    if (ch.charCodeAt(0) === 0x3000) {
      ch = " ";
    }
    // unicode_casefold
    // ch = caseFold(ch);
    // normalized += ch;
    normalized += ch.toLowerCase();
  }

  let normalizedDirect = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!removeForDirect.includes(ch)) {
    normalizedDirect += ch;
    indexMap.push(i);
    }
  }

  function expandSpaces(start, end) {
    while (start > 0 && text[start - 1] === " ") start--;
    while (end < text.length - 1 && text[end + 1] === " ") end++;
    return [start, end];
  }

  // ---------- direct ----------
  direct.forEach(word => {
    let idx = normalizedDirect.indexOf(word);
    while (idx !== -1) {
      let start = indexMap[idx];
      let end = indexMap[idx + word.length - 1];
      offenses.push(expandSpaces(start, end));
      idx = normalizedDirect.indexOf(word, idx + 1);
    }
  });

  // // ---------- literal phrase ----------
  // replicate with non-removed source spaces
  
  // ---------- either side ----------
  eitherSide.forEach(word => {
    let idx = normalized.indexOf(word);
    while (idx !== -1) {
      let start = idx;
      let end = idx + word.length - 1;

      const hasSpaceBefore = start > 0 && text[start - 1] === " ";
      const hasSpaceAfter = end < text.length - 1 && text[end + 1] === " ";

      if (hasSpaceBefore || hasSpaceAfter) {
        offenses.push(expandSpaces(start, end));
      }

      idx = normalized.indexOf(word, idx + 1);
    }
  });
	
  // ---------- left side ----------
  leftSide.forEach(word => {
    let idx = normalized.indexOf(word);
    while (idx !== -1) {
      let start = idx;
      let end = idx + word.length - 1;

      const hasSpaceBefore = start > 0 && text[start - 1] === " ";
      // const hasSpaceAfter = end < text.length - 1 && text[end + 1] === " ";

      if (hasSpaceBefore) {
        offenses.push(expandSpaces(start, end));
      }

      idx = normalized.indexOf(word, idx + 1);
    }
  });
	
  // ---------- both sides ----------
  bothSides.forEach(word => {
    let idx = normalized.indexOf(word);
    while (idx !== -1) {
      let start = idx;
      let end = idx + word.length - 1;

      const hasSpaceBefore = start > 0 && text[start - 1] === " ";
      const hasSpaceAfter = end < text.length - 1 && text[end + 1] === " ";

      if (hasSpaceBefore & hasSpaceAfter) {
        offenses.push(expandSpaces(start, end));
      }

      idx = normalized.indexOf(word, idx + 1);
    }
  });

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
  const offenses = findOffenses(text, removeForDirect, direct, literalPhrase, eitherSide, leftSide, bothSides);
  output.innerHTML = highlight(text, offenses);
});
