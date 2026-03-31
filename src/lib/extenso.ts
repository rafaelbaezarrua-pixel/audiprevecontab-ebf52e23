export function numeroPorExtenso(valor: number): string {
  const unidades = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
  const dezenas10 = ["DEZ", "ONZE", "DOZE", "TREZE", "QUATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZEOITO", "DEZENOVE"];
  const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
  const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];

  const formatarCentena = (n: number) => {
    if (n === 0) return "";
    if (n === 100) return "CEM";
    
    let res = centenas[Math.floor(n / 100)];
    let resto = n % 100;
    
    if (resto > 0) {
      res += " E ";
      if (resto < 10) res += unidades[resto];
      else if (resto < 20) res += dezenas10[resto - 10];
      else {
        res += dezenas[Math.floor(resto / 10)];
        if (resto % 10 > 0) res += " E " + unidades[resto % 10];
      }
    }
    return res;
  };

  if (valor === 0) return "ZERO REAIS";
  
  const reais = Math.floor(valor);
  const centavos = Math.round((valor - reais) * 100);
  
  let resReais = "";
  if (reais > 0) {
    if (reais < 1000) {
      resReais = formatarCentena(reais);
    } else if (reais < 1000000) {
      const milhar = Math.floor(reais / 1000);
      const resto = reais % 1000;
      resReais = (milhar === 1 ? "" : formatarCentena(milhar)) + " MIL";
      if (resto > 0) resReais += (resto < 100 || resto % 100 === 0 ? " E " : " ") + formatarCentena(resto);
    }
    resReais += reais === 1 ? " REAL" : " REAIS";
  }

  let resCentavos = "";
  if (centavos > 0) {
    resCentavos = formatarCentena(centavos) + (centavos === 1 ? " CENTAVO" : " CENTAVOS");
  }

  if (resReais && resCentavos) return resReais + " E " + resCentavos;
  return resReais || resCentavos;
}
