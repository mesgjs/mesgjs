import { parseArgs } from 'jsr:@std/cli/parse-args';
import { DB } from 'https://deno.land/x/sqlite/mod.ts';

const flags = parseArgs(Deno.args, {
    boolean: [ 'lsmap', 'lsmod', 'rmmap' ],
    string: [ 'db', 'mapin', 'mapout' ],
});
const dbFile = (flags.db || 'modules') + '.msjcat';
const db = new DB(dbFile);

db.execute(`
create table if not exists path_map (
input TEXT NOT NULL PRIMARY KEY,
output TEXT NOT NULL
);

create table if not exists modules (
path TEXT NOT NULL,
major INT NOT NULL,
minor INT NOT NULL,
patch INT NOT NULL,
URL TEXT NOT NULL,
sha512 TEXT NOT NULL,
provides TEXT NOT NULL,
requires TEXT NOT NULL,
PRIMARY KEY (path, major, minor, patch)
);
`);

if (flags.mapin) {
    if (flags.rmmap) db.query('delete from path_map where input = ?', [flags.mapin]);
    else if (flags.mapout) db.query('insert into path_map (input, output) values (?, ?)', [flags.mapin, flags.mapout]);
    else {
	const [rows] = db.query('select output from path_map where input = ?', [flags.mapin]);
	if (rows) console.log(flags.mapin + ':', rows[0]);
	else console.log(`Path-map entry "${flags.mapin}" not found`);
    }
}
if (flags.lsmap) {
    console.log('Path-map entries:');
    for (const [input, output] of db.query('select input, output from path_map')) console.log(input + ':', output);
}
