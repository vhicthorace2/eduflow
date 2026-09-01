const { Op } = require('sequelize');

/**
 * Escape LIKE wildcard characters so user-supplied search strings are matched
 * literally instead of acting as SQL `%` / `_` wildcards (LIKE injection / DoS).
 */
const escapeLike = (value) =>
  String(value).replace(/[\\%_]/g, (ch) => `\\${ch}`);

/**
 * Build a case-insensitive substring (contains) match against a column using
 * `LIKE`. The value is parameterized by Sequelize and wildcards are escaped, so
 * only literal substring matching occurs. Returns null when `term` is empty.
 */
const likeContains = (column, term) => {
  if (term == null || String(term).trim() === '') return null;
  return {
    [column]: { [Op.like]: `%${escapeLike(term)}%`, [Op.escape]: '\\' }
  };
};

module.exports = { escapeLike, likeContains };
