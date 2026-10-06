// Vstavaný zoznam najznámejších služieb s dočasnými e-mailmi. Je to len
// záloha — hlavný zdroj sú verejné komunitné zoznamy (tisíce domén), ktoré
// lib/disposableEmail.ts sťahuje automaticky a obnovuje každých 12 hodín.
export const BUILTIN_DISPOSABLE = `
10minutemail.com 10minutemail.net 10minutemail.co.uk 10minutemail.de 10minutemail.org 10minemail.com 20minutemail.com 20minutemail.it
30minutemail.com 33mail.com 24hourmail.com 1secmail.com 1secmail.org 1secmail.net 10mail.org 2prong.com
guerrillamail.com guerrillamail.net guerrillamail.org guerrillamail.biz guerrillamail.de guerrillamail.info guerrillamailblock.com
sharklasers.com grr.la pokemail.net spam4.me
mailinator.com mailinator.net mailinator2.com mailinater.com notmailinator.com sogetthis.com spamherelots.com thisisnotmyrealemail.com
binkmail.com bobmail.info chammy.info devnullmail.com letthemeatspam.com safetymail.info suremail.info tradermail.info veryrealemail.com zippymail.info
yopmail.com yopmail.fr yopmail.net cool.fr.nf jetable.org nospam.ze.tc nomail.xl.cx mega.zik.dj speed.1s.fr courriel.fr.nf moncourrier.fr.nf monemail.fr.nf monmail.fr.nf
temp-mail.org temp-mail.io temp-mail.ru temp-mail.com tempmail.com tempmail.net tempmail.dev tempmail.plus tempmail.email tempmail.us.com tempmailo.com
tempmailaddress.com tempr.email tempail.com tempinbox.com tempemail.net temporaryemail.net temporarymail.com tempomail.fr tmpmail.org tmpmail.net tmpeml.com
discard.email discardmail.com discardmail.de dispostable.com
mail.tm mail.gw dropmail.me emltmp.com yomail.info getnada.com nada.email inboxkitten.com maildrop.cc mailnesia.com mintemail.com mohmal.com mytemp.email
throwawaymail.com trashmail.com trashmail.de trashmail.net trashmail.io trashmail.me trashmail.at trash-mail.com mytrashmail.com mailmetrash.com
wegwerfmail.de wegwerfmail.net wegwerfmail.org einrot.com spambog.com spamgourmet.com mailcatch.com
fakeinbox.com fakemail.net fakemailgenerator.com emailfake.com email-fake.com generator.email emailondeck.com burnermail.io minuteinbox.com moakt.com
harakirimail.com mailpoof.com spamdecoy.net mailsac.com inboxbear.com linshiyouxiang.net
esiix.com wwjmp.com xojxe.com yoggm.com kzccv.com qiott.com wuuvo.com icznn.com ezztt.com vjuum.com laafd.com txcct.com rteet.com dpptd.com oosln.com bheps.com
mailto.plus fexpost.com fexbox.org fextemp.com mailbox.in.ua rover.info chitthi.in any.pink merepost.com emailnax.com
cuvox.de dayrep.com fleckens.hu gustr.com jourrapide.com rhyta.com superrito.com teleworm.us armyspy.com
mvrht.com spamex.com incognitomail.org anonbox.net byom.de mail-temp.com spambox.us mailforspam.com filzmail.com
deadaddress.com mailexpire.com mailzilla.com nowmymail.com onewaymail.com pookmail.com shortmail.net sneakemail.com spamfree24.org spaml.com trbvm.com
smailpro.com emailtemporanea.net correotemporal.org crazymailing.com mailnull.com e4ward.com spamavert.com mailslurp.com
tempmailer.com tempmailer.de anonymbox.com 0-mail.com 0815.ru 0clickemail.com 6paq.com 9ox.net
mailtothis.com mailscrap.com mailsiphon.com mailzi.ru meltmail.com nobulk.com noclickemail.com nogmailspam.info
nomail2me.com nospamfor.us nospammail.net objectmail.com obobbo.com oneoffemail.com pjjkp.com put2.net quickinbox.com rcpt.at
recode.me regbypass.com rmqkr.net s0ny.net safersignup.de saynotospams.com selfdestructingmail.com
sendspamhere.com shiftmail.com skeefmail.com slopsbox.com smellfear.com snakemail.com sofort-mail.de spam.la spamail.de
spambob.com spambox.info spamcannon.com spamcero.com spamcorptastic.com spamcowboy.com spamday.com spamevader.com spamfree.eu
spamhole.com spamify.com spaminator.de spamkill.info spammotel.com spamobox.com spamoff.de spamslicer.com spamspot.com spamthis.co.uk
spamtroll.net supergreatmail.com supermailer.jp tempalias.com tempe-mail.com tempemail.biz tempemail.co.za tempmail.it tempmail2.com
tempthe.net thanksnospam.info thisisnotmyrealemail.com throam.com tilien.com tmailinator.com trashdevil.com
trashemail.de trashymail.com tyldd.com wh4f.org whyspam.me willselfdestruct.com wronghead.com
wuzup.net xagloo.com xemaps.com xents.com xmaily.com xoxy.net yuurok.com zehnminutenmail.de zoemail.org
emailtemporario.com.br emailtemporar.ro tempmail.ninja tempmail.lol tempmail.so instantemailaddress.com mailtemp.info
inboxalias.com kasmail.com luxusmail.org mailmoat.com mailnator.com receiveee.com emailsensei.com
`
  .split(/\s+/)
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

// Bežní poskytovatelia, ktorí sa NIKDY nezablokujú (ochrana pred chybou v
// cudzom zozname).
export const SAFE_PROVIDERS = `
gmail.com googlemail.com outlook.com outlook.cz outlook.sk hotmail.com hotmail.cz hotmail.sk live.com live.cz msn.com
icloud.com me.com mac.com yahoo.com yahoo.co.uk ymail.com aol.com proton.me protonmail.com pm.me zoho.com gmx.com gmx.net gmx.de
seznam.cz email.cz post.cz spoluzaci.cz centrum.cz atlas.cz volny.cz tiscali.cz quick.cz
azet.sk post.sk centrum.sk zoznam.sk atlas.sk pobox.sk stonline.sk orangemail.sk chello.sk
web.de t-online.de wp.pl o2.pl onet.pl interia.pl mail.ru yandex.ru yandex.com
`
  .split(/\s+/)
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);
