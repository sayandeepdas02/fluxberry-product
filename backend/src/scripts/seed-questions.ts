import type { Difficulty } from '@fluxberry/shared';

export interface SeedQuestion {
  category: string;
  difficulty: Difficulty;
  skills: string[];
  question: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
}

/** Curated MCQ bank used by the dev seed (spec §37). */
export const SEED_QUESTIONS: SeedQuestion[] = [
  { category: 'JavaScript', difficulty: 'EASY', skills: ['JavaScript'], question: 'Which keyword declares a block-scoped variable?', options: ['var', 'let', 'function', 'global'], correct: 1 },
  { category: 'JavaScript', difficulty: 'EASY', skills: ['JavaScript'], question: 'What does `typeof null` return?', options: ["'null'", "'object'", "'undefined'", "'number'"], correct: 1 },
  { category: 'JavaScript', difficulty: 'MEDIUM', skills: ['JavaScript'], question: 'What is the output of `[1,2,3].map(x => x*2)`?', options: ['[1,2,3]', '[2,4,6]', '6', 'undefined'], correct: 1 },
  { category: 'JavaScript', difficulty: 'MEDIUM', skills: ['JavaScript'], question: 'Which method returns a new promise that resolves when all input promises resolve?', options: ['Promise.race', 'Promise.all', 'Promise.any', 'Promise.resolve'], correct: 1 },
  { category: 'JavaScript', difficulty: 'HARD', skills: ['JavaScript'], question: 'A closure gives a function access to…', options: ['Only global scope', "Its outer function's variables", 'Only its own parameters', 'The DOM'], correct: 1 },
  { category: 'TypeScript', difficulty: 'EASY', skills: ['TypeScript'], question: 'Which type means "any value"?', options: ['unknown', 'never', 'void', 'null'], correct: 0 },
  { category: 'TypeScript', difficulty: 'MEDIUM', skills: ['TypeScript'], question: 'What does the `readonly` modifier do?', options: ['Hides a property', 'Prevents reassignment after init', 'Makes it optional', 'Marks it private'], correct: 1 },
  { category: 'TypeScript', difficulty: 'MEDIUM', skills: ['TypeScript'], question: 'What is `Partial<T>`?', options: ['All props required', 'All props optional', 'Removes props', 'Readonly props'], correct: 1 },
  { category: 'React', difficulty: 'EASY', skills: ['React'], question: 'Which hook manages local component state?', options: ['useEffect', 'useState', 'useMemo', 'useRef'], correct: 1 },
  { category: 'React', difficulty: 'MEDIUM', skills: ['React'], question: 'When does useEffect with an empty dependency array run?', options: ['On every render', 'Only once after mount', 'Never', 'Before render'], correct: 1 },
  { category: 'React', difficulty: 'MEDIUM', skills: ['React'], question: 'What is the purpose of a `key` prop in a list?', options: ['Styling', 'Stable identity for reconciliation', 'Sorting', 'Accessibility only'], correct: 1 },
  { category: 'React', difficulty: 'HARD', skills: ['React'], question: 'Which hook memoizes an expensive computed value?', options: ['useCallback', 'useMemo', 'useContext', 'useReducer'], correct: 1 },
  { category: 'Node.js', difficulty: 'EASY', skills: ['Node.js'], question: 'Node.js is built on which JS engine?', options: ['SpiderMonkey', 'V8', 'JavaScriptCore', 'Chakra'], correct: 1 },
  { category: 'Node.js', difficulty: 'MEDIUM', skills: ['Node.js'], question: 'Which is best for CPU-bound work in Node?', options: ['Blocking the event loop', 'Worker threads', 'More callbacks', 'setTimeout'], correct: 1 },
  { category: 'Node.js', difficulty: 'MEDIUM', skills: ['Node.js', 'Express'], question: 'In Express, what runs between request and response?', options: ['Middleware', 'Reducers', 'Selectors', 'Directives'], correct: 0 },
  { category: 'Backend', difficulty: 'MEDIUM', skills: ['Backend'], question: 'Which HTTP status means "created"?', options: ['200', '201', '204', '400'], correct: 1 },
  { category: 'Backend', difficulty: 'MEDIUM', skills: ['Backend'], question: 'What makes an operation idempotent?', options: ['It runs fast', 'Repeating it has the same effect', 'It uses caching', 'It is async'], correct: 1 },
  { category: 'Backend', difficulty: 'HARD', skills: ['Backend'], question: 'A message queue primarily helps with…', options: ['Styling', 'Decoupling & async processing', 'Type checking', 'Rendering'], correct: 1 },
  { category: 'SQL', difficulty: 'EASY', skills: ['SQL'], question: 'Which statement reads rows?', options: ['INSERT', 'SELECT', 'UPDATE', 'DELETE'], correct: 1 },
  { category: 'SQL', difficulty: 'MEDIUM', skills: ['SQL'], question: 'Which JOIN returns only matching rows in both tables?', options: ['LEFT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN'], correct: 1 },
  { category: 'SQL', difficulty: 'MEDIUM', skills: ['SQL'], question: 'What does an index primarily improve?', options: ['Write speed', 'Read/lookup speed', 'Disk usage', 'Security'], correct: 1 },
  { category: 'PostgreSQL', difficulty: 'MEDIUM', skills: ['PostgreSQL'], question: 'Which type stores schemaless JSON efficiently in Postgres?', options: ['TEXT', 'JSONB', 'BLOB', 'VARCHAR'], correct: 1 },
  { category: 'Python', difficulty: 'EASY', skills: ['Python'], question: 'Which is a list comprehension?', options: ['[x for x in xs]', '{x: y}', '(x, y)', 'lambda x: x'], correct: 0 },
  { category: 'Python', difficulty: 'MEDIUM', skills: ['Python'], question: 'What does a generator use to yield values lazily?', options: ['return', 'yield', 'raise', 'async'], correct: 1 },
  { category: 'System Design', difficulty: 'MEDIUM', skills: ['System Design'], question: 'What does horizontal scaling mean?', options: ['Bigger machine', 'More machines', 'More RAM', 'Faster disk'], correct: 1 },
  { category: 'System Design', difficulty: 'HARD', skills: ['System Design'], question: 'A CDN primarily reduces…', options: ['Database size', 'Latency for static assets', 'Code size', 'Memory leaks'], correct: 1 },
  { category: 'System Design', difficulty: 'HARD', skills: ['System Design'], question: 'Which improves read scalability of a database?', options: ['Read replicas', 'More indexes only', 'Bigger rows', 'Fewer tables'], correct: 0 },
  { category: 'Data Structures', difficulty: 'EASY', skills: ['Data Structures'], question: 'Average lookup time in a hash map?', options: ['O(n)', 'O(1)', 'O(log n)', 'O(n^2)'], correct: 1 },
  { category: 'Data Structures', difficulty: 'MEDIUM', skills: ['Data Structures'], question: 'Which structure is FIFO?', options: ['Stack', 'Queue', 'Tree', 'Heap'], correct: 1 },
  { category: 'Algorithms', difficulty: 'MEDIUM', skills: ['Algorithms'], question: 'Time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'], correct: 1 },
  { category: 'Algorithms', difficulty: 'HARD', skills: ['Algorithms'], question: 'Which sort has O(n log n) average time and is stable?', options: ['Quick sort', 'Merge sort', 'Bubble sort', 'Selection sort'], correct: 1 },
  { category: 'Frontend', difficulty: 'EASY', skills: ['Frontend', 'CSS'], question: 'Which CSS property controls layout as rows/columns?', options: ['float', 'display: flex/grid', 'position', 'z-index'], correct: 1 },
];
