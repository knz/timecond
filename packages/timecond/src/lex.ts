import moo from 'moo';

export const lexer = moo.compile({
  lpar: { match: /\(/ },
  rpar: { match: /\)/ },
  colon: { match: /:/ },
  period: { match: /\./ },
  comma: { match: /,/ },
  number: { match: /[0-9]+/ },
  identifier: { match: /[a-zA-Z_][a-zA-Z0-9_]*/ },
  ws: { match: /\s+/, lineBreaks: true },
});

const prevNext = lexer.next.bind(lexer);
lexer.next = function () {
  let token = prevNext();
  while (token && token.type === 'ws') {
    token = prevNext();
  }
  return token;
};
