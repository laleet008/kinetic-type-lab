import * as React from 'react';

export type HLTokenType =
  | 'comment'
  | 'keyword'
  | 'string'
  | 'number'
  | 'tag'
  | 'property'
  | 'punct'
  | 'plain';

export type HLToken = {
  type: HLTokenType;
  text: string;
};

export const HL_COLORS: Record<HLTokenType, string> = {
  comment: '#8A8A93',
  keyword: 'var(--accent, #C6FF4F)',
  string: '#C6FF4F',
  number: '#4ECDC4',
  tag: 'var(--text, #ECECEE)',
  property: '#8A8A93',
  punct: 'var(--dim, #8A8A93)',
  plain: 'var(--text, #ECECEE)',
};

const COMMENT_RE = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)/;
const STRING_RE = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/;
const NUMBER_RE = /\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/;
const KEYWORDS_JS = new Set([
  'const',
  'let',
  'var',
  'function',
  'return',
  'import',
  'from',
  'class',
  'export',
  'default',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'break',
  'continue',
  'new',
  'typeof',
  'instanceof',
  'in',
  'of',
  'void',
  'delete',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'true',
  'false',
  'null',
  'undefined',
  'type',
  'interface',
  'enum',
  'namespace',
  'public',
  'private',
  'protected',
  'readonly',
  'static',
  'implements',
  'extends',
  'super',
  'this',
  'as',
  'is',
]);

const KEYWORDS_CSS = new Set([
  'import',
  'media',
  'keyframes',
  'from',
  'to',
  'and',
  'not',
  'only',
  'url',
  'calc',
  'var',
  'important',
  'auto',
  'none',
  'infinite',
  'forwards',
  'backwards',
  'both',
  'alternate',
  'linear',
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'step-start',
  'step-end',
  'inline-block',
  'block',
  'inline',
  'flex',
  'grid',
  'absolute',
  'relative',
  'fixed',
  'sticky',
  'static',
  'visible',
  'hidden',
  'scroll',
  'nowrap',
  'normal',
  'pre',
  'pointer-events',
  'middle',
  'baseline',
  'sub',
  'super',
  'text-top',
  'text-bottom',
]);

function tokenizeJS(src: string, keywords: Set<string>): HLToken[] {
  const tokens: HLToken[] = [];
  const lines = src.split('\n');
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let i = 0;
    while (i < line.length) {
      let matched = false;

      if (!matched) {
        const m = line.substring(i).match(COMMENT_RE);
        if (m && m.index === 0) {
          tokens.push({ type: 'comment', text: m[1] });
          i += m[1].length;
          matched = true;
        }
      }

      if (!matched) {
        const m = line.substring(i).match(STRING_RE);
        if (m && m.index === 0) {
          tokens.push({ type: 'string', text: m[1] });
          i += m[1].length;
          matched = true;
        }
      }

      if (!matched) {
        const m = line.substring(i).match(NUMBER_RE);
        if (m && m.index === 0) {
          tokens.push({ type: 'number', text: m[1] });
          i += m[1].length;
          matched = true;
        }
      }

      if (!matched) {
        const m = line.substring(i).match(/^([A-Za-z_$][\w$]*)/);
        if (m) {
          const word = m[1];
          if (keywords.has(word)) {
            tokens.push({ type: 'keyword', text: word });
          } else {
            tokens.push({ type: 'plain', text: word });
          }
          i += word.length;
          matched = true;
        }
      }

      if (!matched) {
        const m = line.substring(i).match(/^([{}\[\]().,;:=&|!?<>+\-*/%^~]+)/);
        if (m) {
          tokens.push({ type: 'punct', text: m[1] });
          i += m[1].length;
          matched = true;
        }
      }

      if (!matched) {
        const m = line.substring(i).match(/^(\s+)/);
        if (m) {
          tokens.push({ type: 'plain', text: m[1] });
          i += m[1].length;
          matched = true;
        } else {
          tokens.push({ type: 'plain', text: line[i] });
          i += 1;
        }
      }
    }
    if (li < lines.length - 1) {
      tokens.push({ type: 'plain', text: '\n' });
    }
  }
  return tokens;
}

function tokenizeCSS(src: string): HLToken[] {
  const tokens: HLToken[] = [];
  const lines = src.split('\n');
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let i = 0;
    while (i < line.length) {
      let matched = false;

      const mC = line.substring(i).match(COMMENT_RE);
      if (mC && mC.index === 0) {
        tokens.push({ type: 'comment', text: mC[1] });
        i += mC[1].length;
        continue;
      }

      const mS = line.substring(i).match(STRING_RE);
      if (mS && mS.index === 0) {
        tokens.push({ type: 'string', text: mS[1] });
        i += mS[1].length;
        continue;
      }

      const mN = line.substring(i).match(NUMBER_RE);
      if (mN && mN.index === 0) {
        const next = i + mN[1].length;
        const unitMatch = line.substring(next).match(/^([a-zA-Z%]+)/);
        let numberText = mN[1];
        if (unitMatch && unitMatch.index === 0) {
          numberText += unitMatch[1];
          tokens.push({ type: 'number', text: numberText });
          i += numberText.length;
          continue;
        }
        tokens.push({ type: 'number', text: mN[1] });
        i += mN[1].length;
        continue;
      }

      const mKW = line.substring(i).match(/^([A-Za-z-][A-Za-z0-9-]*)/);
      if (mKW) {
        const word = mKW[1];
        const afterIdx = i + word.length;
        const restOfLine = line.substring(afterIdx);
        const propMatch = restOfLine.match(/^\s*:/);
        if (propMatch) {
          tokens.push({ type: 'property', text: word });
        } else if (KEYWORDS_CSS.has(word)) {
          tokens.push({ type: 'keyword', text: word });
        } else {
          const before = tokens.length > 0 ? tokens[tokens.length - 1] : null;
          if (
            before &&
            (before.type === 'punct' && /[\n{]/.test(before.text) || before.text === '\n')
          ) {
            tokens.push({ type: 'tag', text: word });
          } else {
            tokens.push({ type: 'plain', text: word });
          }
        }
        i += word.length;
        matched = true;
      }

      if (!matched) {
        const mP = line.substring(i).match(/^([{}\[\]().,;:&>+~*#@%=|^\-?]+)/);
        if (mP) {
          tokens.push({ type: 'punct', text: mP[1] });
          i += mP[1].length;
          matched = true;
        }
      }

      if (!matched) {
        const mW = line.substring(i).match(/^(\s+)/);
        if (mW) {
          tokens.push({ type: 'plain', text: mW[1] });
          i += mW[1].length;
        } else {
          tokens.push({ type: 'plain', text: line[i] });
          i += 1;
        }
      }
    }
    if (li < lines.length - 1) {
      tokens.push({ type: 'plain', text: '\n' });
    }
  }
  return tokens;
}

function tokenizeHTML(src: string): HLToken[] {
  const tokens: HLToken[] = [];
  let i = 0;
  while (i < src.length) {
    const cStart = src.substring(i).match(/(<!--[\s\S]*?-->)/);
    if (cStart && cStart.index === 0) {
      tokens.push({ type: 'comment', text: cStart[1] });
      i += cStart[1].length;
      continue;
    }

    const tagOpen = src.substring(i).match(/^(<\/?[A-Za-z][A-Za-z0-9-]*)/);
    if (tagOpen) {
      tokens.push({ type: 'tag', text: tagOpen[1] });
      i += tagOpen[1].length;
      continue;
    }

    if (src[i] === '>' || src[i] === '=' || src[i] === '/') {
      tokens.push({ type: 'punct', text: src[i] });
      i += 1;
      continue;
    }

    const attrVal = src.substring(i).match(STRING_RE);
    if (attrVal && attrVal.index === 0) {
      tokens.push({ type: 'string', text: attrVal[1] });
      i += attrVal[1].length;
      continue;
    }

    const attrName = src.substring(i).match(/^([A-Za-z-][A-Za-z0-9-]*)/);
    if (attrName) {
      tokens.push({ type: 'property', text: attrName[1] });
      i += attrName[1].length;
      continue;
    }

    const num = src.substring(i).match(NUMBER_RE);
    if (num && num.index === 0) {
      tokens.push({ type: 'number', text: num[1] });
      i += num[1].length;
      continue;
    }

    const ws = src.substring(i).match(/^(\s+)/);
    if (ws) {
      tokens.push({ type: 'plain', text: ws[1] });
      i += ws[1].length;
      continue;
    }

    tokens.push({ type: 'plain', text: src[i] });
    i += 1;
  }
  return tokens;
}

export function tokenize(src: string, lang: 'css' | 'js' | 'tsx' | 'html'): HLToken[] {
  if (lang === 'css') return tokenizeCSS(src);
  if (lang === 'html') return tokenizeHTML(src);
  return tokenizeJS(src, KEYWORDS_JS);
}

export function highlightTokens(
  tokens: HLToken[],
  extraClass = '',
): Array<React.ReactElement> {
  return tokens.map((t, idx) => {
    const color = HL_COLORS[t.type] || HL_COLORS.plain;
    const style: React.CSSProperties = { color };
    if (t.type === 'keyword') {
      style.fontWeight = 600;
    }
    return React.createElement(
      'span',
      { key: idx, style, className: extraClass },
      t.text,
    );
  });
}

export type HighlightedCodeProps = {
  code: string;
  lang: 'css' | 'js' | 'tsx' | 'html';
  className?: string;
};

export function HighlightedCode({
  code,
  lang,
  className = '',
}: HighlightedCodeProps): React.ReactElement {
  const tokens = tokenize(code, lang);
  const spans = highlightTokens(tokens);
  return React.createElement(
    'pre',
    {
      className:
        'm-0 p-4 overflow-auto bg-[#0E0E11] border border-[--line] rounded text-xs leading-relaxed font-mono ' +
        className,
      style: { maxHeight: '380px', tabSize: 2 },
    },
    React.createElement('code', null, spans),
  );
}
