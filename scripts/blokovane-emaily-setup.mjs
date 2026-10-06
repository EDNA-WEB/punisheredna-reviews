// Jednorazová úprava pre blokovanie dočasných e-mailov:
//  1) prisma/schema.prisma — model EmailDomainRule (vlastné blokované/povolené domény)
//  2) components/admin/adminNav.ts — položka „Blokované e-maily“ v menu administrácie
// Dá sa spustiť opakovane.
import fs from 'node:fs';

const nlOf = (s) => (s.includes('\r\n') ? '\r\n' : '\n');

const sp = 'prisma/schema.prisma';
let s = fs.readFileSync(sp, 'utf8');
if (/^model EmailDomainRule \{/m.test(s)) {
  console.log(`OK  ${sp} (už obsahuje)`);
} else {
  const nl = nlOf(s);
  s = s.trimEnd() + nl + nl + [
    'model EmailDomainRule {',
    '  domain    String   @id',
    '  allow     Boolean  @default(false)',
    '  note      String?',
    '  createdAt DateTime @default(now())',
    '}'
  ].join(nl) + nl;
  fs.writeFileSync(sp, s);
  console.log(`OK  ${sp}`);
}

const np = ['components/admin/adminNav.ts', 'components/admin/adminNav.tsx'].find((f) => fs.existsSync(f));
if (!np) {
  console.log('POZOR: menu administrácie sa nenašlo — stránka je dostupná na /admin/blokovane-emaily');
} else {
  let n = fs.readFileSync(np, 'utf8');
  if (n.includes("'/admin/blokovane-emaily'")) {
    console.log(`OK  ${np} (už obsahuje)`);
  } else {
    const nl = nlOf(n);
    const lines = n.split(/\r?\n/);
    const anchors = ["'/admin/users'", "'/admin/nahlasenia'", "'/admin/sdileni'"];
    let idx = -1;
    for (const a of anchors) {
      idx = lines.findIndex((l) => l.includes(a) && l.includes('{') && l.includes('}'));
      if (idx >= 0) break;
    }
    if (idx < 0) {
      console.log('POZOR: v menu som nenašiel vhodné miesto — stránka je dostupná na /admin/blokovane-emaily');
    } else {
      const line = lines[idx]
        .replace(/'\/admin\/[a-z-]+'/, "'/admin/blokovane-emaily'")
        .replace(/label:\s*'[^']*'/, "label: 'Blokované e-maily'")
        .replace(/,?\s*$/, '');
      if (!lines[idx].trimEnd().endsWith(',')) lines[idx] = lines[idx].trimEnd() + ',';
      lines.splice(idx + 1, 0, line + (lines[idx + 1] && lines[idx + 1].trim().startsWith('{') ? ',' : ''));
      fs.writeFileSync(np, lines.join(nl));
      console.log(`OK  ${np}`);
    }
  }
}
