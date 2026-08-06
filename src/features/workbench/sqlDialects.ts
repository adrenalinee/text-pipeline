import type { SqlLanguage } from 'sql-formatter'

export type SqlDialectId =
  | 'bigquery'
  | 'mariadb'
  | 'mysql'
  | 'plsql'
  | 'postgresql'
  | 'snowflake'
  | 'sqlite'
  | 'sql'
  | 'transactsql'

export type SqlDialect = {
  // Language key passed to sql-formatter
  formatterLanguage: SqlLanguage
  id: SqlDialectId
  label: string
  // Database name passed to node-sql-parser; null = generic, no parser validation
  parserDatabase: string | null
}

export const SQL_DIALECT_OPTIONS: ReadonlyArray<SqlDialect> = [
  { id: 'sql',         label: 'Generic SQL', formatterLanguage: 'sql',         parserDatabase: null          },
  { id: 'postgresql',  label: 'PostgreSQL',  formatterLanguage: 'postgresql',  parserDatabase: 'PostgreSQL'  },
  { id: 'mysql',       label: 'MySQL',       formatterLanguage: 'mysql',       parserDatabase: 'MySQL'       },
  { id: 'mariadb',     label: 'MariaDB',     formatterLanguage: 'mariadb',     parserDatabase: 'MariaDB'     },
  { id: 'sqlite',      label: 'SQLite',      formatterLanguage: 'sqlite',      parserDatabase: 'Sqlite'      },
  { id: 'bigquery',    label: 'BigQuery',    formatterLanguage: 'bigquery',    parserDatabase: 'BigQuery'    },
  { id: 'snowflake',   label: 'Snowflake',   formatterLanguage: 'snowflake',   parserDatabase: 'Snowflake'   },
  { id: 'transactsql', label: 'TransactSQL', formatterLanguage: 'transactsql', parserDatabase: 'TransactSQL' },
  { id: 'plsql',       label: 'Oracle (PL/SQL)', formatterLanguage: 'plsql',   parserDatabase: null          },
]

export const DEFAULT_SQL_DIALECT: SqlDialect = SQL_DIALECT_OPTIONS[0]

export function getSqlDialect(id: SqlDialectId): SqlDialect {
  return SQL_DIALECT_OPTIONS.find((d) => d.id === id) ?? DEFAULT_SQL_DIALECT
}
