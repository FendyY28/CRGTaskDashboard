import {
  findTaskByName,
  formatSequentialId,
  normalizeIssueId,
  normalizeTaskInput,
  parseTaskList,
} from './project-text.utils';

/** Pure payload normalisation — the rules the weekly-log and PIR services rely on. */
describe('project-text.utils', () => {
  describe('formatSequentialId', () => {
    it('pads to three digits and leaves larger numbers alone', () => {
      expect(formatSequentialId('PRJ', 7)).toBe('PRJ-007');
      expect(formatSequentialId('PRJ', 999)).toBe('PRJ-999');
      expect(formatSequentialId('PRJ', 1000)).toBe('PRJ-1000');
    });
  });

  describe('normalizeIssueId', () => {
    it('canonicalises bare numbers to the ISS- format', () => {
      expect(normalizeIssueId('12')).toBe('ISS-012');
      expect(normalizeIssueId('iss-7')).toBe('ISS-007');
    });

    it('returns null for empty or non-numeric codes so an id is generated', () => {
      expect(normalizeIssueId(undefined)).toBeNull();
      expect(normalizeIssueId('   ')).toBeNull();
      expect(normalizeIssueId('ISS-')).toBeNull();
      expect(normalizeIssueId('custom-code')).toBeNull();
    });
  });

  describe('normalizeTaskInput', () => {
    it('accepts a plain string as the task name', () => {
      expect(normalizeTaskInput('  Fix   login ')).toEqual({
        taskName: 'Fix login',
        description: '',
      });
    });

    it('keeps the description and drops a nameless task', () => {
      expect(normalizeTaskInput({ taskName: 'Deploy', description: ' to UAT ' })).toEqual({
        taskName: 'Deploy',
        description: 'to UAT',
      });
      expect(normalizeTaskInput({ taskName: '   ', description: 'x' })).toBeNull();
      expect(normalizeTaskInput(null)).toBeNull();
    });
  });

  describe('parseTaskList', () => {
    it('drops nameless rows and de-duplicates case-insensitively, keeping order', () => {
      const tasks = parseTaskList([
        'QA sign-off',
        { taskName: 'qa SIGN-OFF', description: 'duplicate' },
        { taskName: '', description: 'nameless' },
        { taskName: 'Deploy', description: 'ship it' },
      ]);

      expect(tasks).toEqual([
        { taskName: 'QA sign-off', description: '' },
        { taskName: 'Deploy', description: 'ship it' },
      ]);
    });

    it('wraps a single payload in a list', () => {
      expect(parseTaskList({ taskName: 'One', description: 'd' })).toHaveLength(1);
    });
  });

  describe('findTaskByName', () => {
    it('matches case-insensitively', () => {
      const existing = [{ taskName: 'Deploy' }, { taskName: 'Review' }];
      expect(findTaskByName(existing, 'dEpLoY')).toEqual({ taskName: 'Deploy' });
      expect(findTaskByName(existing, 'missing')).toBeUndefined();
    });
  });
});
