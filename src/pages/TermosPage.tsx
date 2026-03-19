import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import logoAudipreve from "@/assets/logo-audipreve.png";

const TermosPage: React.FC = () => {
  const { user, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    if (!accepted || !acceptedLgpd) {
      toast.error("Você precisa aceitar ambos os termos para continuar");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        terms_accepted_at: new Date().toISOString(),
      }).eq("user_id", user!.id);
      if (error) throw error;
      await refreshUserData();
      toast.success("Termos aceitos com sucesso!");
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" style={{ background: "var(--gradient-bg)" }}>
      <div className="w-full max-w-3xl bg-card rounded-2xl shadow-xl border border-border">
        <div className="flex flex-col items-center p-8 border-b border-border relative">
          <button 
            onClick={logout}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-destructive transition-colors text-xs font-bold flex items-center gap-1"
          >
            Sair
          </button>
          <img src={logoAudipreve} alt="Audipreve" className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-card-foreground">Termos de Uso e Responsabilidade</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">Leia e aceite os termos abaixo para acessar o sistema</p>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Termos de Uso */}
          <div>
            <h2 className="text-lg font-bold text-card-foreground mb-3 uppercase">1. Termos de Uso e Acesso ao Sistema</h2>
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground space-y-3 border border-border">
              <p><strong>1.1. Natureza e Propriedade Intelectual:</strong> O sistema constitui ferramenta de trabalho de licenciamento exclusivo da AUDIPREVE CONTABILIDADE, sendo ativo imaterial estritamente confidencial, destinado ao uso exclusivo de colaboradores e parceiros formalmente autorizados no exercício de suas funções.</p>
              <p><strong>1.2. Inalienabilidade das Credenciais:</strong> O acesso dar-se-á mediante credenciais (login e senha) de natureza pessoal, nominal, intransferível e sigilosa. O usuário assume a responsabilidade civil e integral por toda e qualquer operação, consulta ou transação efetuada sob sua autenticação.</p>
              <p><strong>1.3. Dever de Custódia:</strong> É terminantemente vedado o compartilhamento, a cessão ou a exposição de credenciais a terceiros, independentemente do nível hierárquico ou pretexto de urgência. A guarda e o sigilo da senha são obrigações personalíssimas do usuário.</p>
              <p><strong>1.4. Destinação Adstrita à Finalidade Profissional:</strong> O usuário obriga-se a utilizar o ecossistema digital e seus recursos exclusivamente para a consecução do objeto social da AUDIPREVE CONTABILIDADE, sendo vedada qualquer utilização para fins particulares, recreativos ou alheios às atribuições laborais.</p>
              <p><strong>1.5. Poder Diretivo e Sanções:</strong> A violação de qualquer diretriz deste termo, bem como tentativas de intrusão ou uso anômalo, ensejará o bloqueio imediato dos acessos, sem prejuízo da aplicação das sanções disciplinares previstas no Artigo 482 da CLT (Justa Causa) e das medidas judiciais de natureza reparatória.</p>
              <p><strong>1.6. Inexistência de Expectativa de Privacidade e Auditoria:</strong> A AUDIPREVE CONTABILIDADE, no exercício de seu poder de fiscalização, reserva-se o direito de monitorar, registrar e auditar integralmente os logs de acesso, tráfego de dados e atividades sistêmicas. O usuário declara ciência inequívoca de que não há expectativa de privacidade em ambiente corporativo e sistêmico fornecido pela empresa.</p>
              <p><strong>1.7. Disponibilidade e Manutenção:</strong> O sistema poderá ser objeto de atualizações, suspensões programadas para manutenção ou modificações estruturais, visando a segurança da informação e o aprimoramento das funcionalidades, sem que isso gere direito a pleitos compensatórios pelo usuário.</p>
            </div>
          </div>

          {/* Termos LGPD */}
          <div>
            <h2 className="text-lg font-bold text-card-foreground mb-3 uppercase">2. Termo de Responsabilidade, Sigilo e Conformidade (LGPD)</h2>
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground space-y-3 border border-border">
              <p><strong>2.1. Estrita Observância Legal e Ética:</strong> O usuário obriga-se a pautar sua conduta em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD), o Código de Ética Profissional do Contador (NBC PG 01) e as resoluções do Conselho Federal de Contabilidade (CFC).</p>
              <p><strong>2.2. Dever de Confidencialidade Perpétua:</strong> Todas as informações custodiadas — incluindo, mas não se limitando a: dados pessoais, dados sensíveis, segredos de negócio, dados financeiros, fiscais e societários de clientes — gozam de proteção por sigilo profissional. Este dever de confidencialidade subsiste de forma perene, mantendo-se íntegro mesmo após a extinção do vínculo jurídico (trabalhista ou contratual) com a AUDIPREVE CONTABILIDADE.</p>
              <p><strong>2.3. Princípios do Tratamento de Dados:</strong> O acesso e o tratamento de dados de clientes deverão observar os princípios da finalidade, necessidade e adequação, limitando-se ao mínimo indispensável para o cumprimento da obrigação profissional específica designada ao usuário.</p>
              <p><strong>2.4. Vedação à Exfiltração de Dados:</strong> É expressamente proibida a reprodução, extração, fotografia, impressão ou transmissão de dados para dispositivos ou ambientes externos (unidades de armazenamento removíveis, e-mails particulares, repositórios em nuvem pessoal ou aplicativos de mensageria instantânea) sem autorização prévia, formal e específica da Diretoria.</p>
              <p><strong>2.5. Protocolo de Incidentes:</strong> O usuário deverá reportar imediatamente ao Encarregado de Dados (DPO) ou à Administração qualquer evidência ou suspeita de vulnerabilidade, vazamento, perda de integridade ou acesso não autorizado por terceiros.</p>
              <p><strong>2.6. Regime de Responsabilidade e Cominações:</strong> A inobservância das obrigações de sigilo e proteção de dados sujeitará o infrator às seguintes esferas de punibilidade:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li><strong>Esfera Laboral:</strong> Aplicação de medidas disciplinares, culminando na dispensa por justa causa;</li>
                <li><strong>Esfera Civil:</strong> Responsabilização por perdas e danos, danos morais e regressividade em caso de condenações da empresa perante terceiros ou a ANPD;</li>
                <li><strong>Esfera Criminal:</strong> Persecução penal pelos crimes de violação de sigilo profissional (Art. 154 do CP) e invasão de dispositivo informático (Art. 154-A do CP).</li>
              </ul>
              <p><strong>2.7. Tratamento de Dados do Usuário:</strong> Para fins de segurança, auditoria e cumprimento de obrigações legais, o usuário consente com a coleta e o tratamento de seus dados identificadores (Nome, CPF, IP, Geolocalização e Biometria de acesso) pela AUDIPREVE CONTABILIDADE, nos termos do Art. 7º, incisos II e V da LGPD.</p>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-border space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 rounded border-border" />
            <span className="text-sm text-card-foreground">Li e aceito os <strong>Termos de Uso e Acesso ao Sistema</strong> descritos acima.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptedLgpd} onChange={e => setAcceptedLgpd(e.target.checked)} className="mt-1 rounded border-border" />
            <span className="text-sm text-card-foreground">Li e aceito o <strong>Termo de Responsabilidade, Sigilo e Conformidade (LGPD)</strong>, comprometendo-me com o sigilo e a proteção dos dados acessados.</span>
          </label>

          <button onClick={handleAccept} disabled={saving || !accepted || !acceptedLgpd} className="w-full py-3 rounded-lg text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50 transition-all" style={{ background: "var(--gradient-primary)" }}>
            {saving ? "Processando..." : "Aceitar e Acessar o Sistema"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermosPage;
