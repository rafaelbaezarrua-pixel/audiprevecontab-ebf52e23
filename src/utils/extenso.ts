export function numeroPorExtenso(numero: number): string {
    if (numero === 0) return 'zero reais';

    const c = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    const d = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const d10 = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];

    function parseGroup(n: number): string {
        let text = '';
        if (n === 100) return 'cem';
        const cen = Math.floor(n / 100);
        const dez = Math.floor((n % 100) / 10);
        const uni = n % 10;

        if (cen > 0) text += (cen === 1 ? 'cento' : c[cen]);
        if (dez > 0) {
            if (text) text += ' e ';
            if (dez === 1) text += d10[uni];
            else {
                text += d[dez];
                if (uni > 0) text += ' e ' + u[uni];
            }
        } else if (uni > 0) {
            if (text) text += ' e ';
            text += u[uni];
        }
        return text;
    }

    const reais = Math.floor(numero);
    const centavos = Math.round((numero - reais) * 100);
    const txtReais = parseGroup(reais);
    const txtCentavos = parseGroup(centavos);

    const res = [];
    if (reais > 0) {
        if (reais >= 1000) {
            const milhares = Math.floor(reais / 1000);
            const resto = reais % 1000;
            res.push((milhares === 1 ? 'mil' : parseGroup(milhares) + ' mil') + (resto > 0 && resto <= 100 ? ' e' : ''));
            if (resto > 0) res.push(parseGroup(resto));
        } else {
            res.push(txtReais);
        }
        res.push(reais === 1 ? 'real' : 'reais');
    }
    if (centavos > 0) {
        if (reais > 0) res.push('e');
        res.push(txtCentavos);
        res.push(centavos === 1 ? 'centavo' : 'centavos');
    }

    return res.join(' ').toUpperCase().replace(/\s+/g, ' ').trim();
}
