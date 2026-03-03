import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import logoAudipreve from "@/assets/logo-audipreve.png";

const TermosPage: React.FC = () => {
  const { user } = useAuth();
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
      toast.success("Termos aceitos com sucesso!");
      navigate("/dashboard", { replace: true });
      window.location.reload();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" style={{ background: "var(--gradient-bg)" }}>
      <div className="w-full max-w-3xl bg-card rounded-2xl shadow-xl border border-border">
        <div className="flex flex-col items-center p-8 border-b border-border">
          <img src={logoAudipreve} alt="Audipreve" className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-card-foreground">Termos de Uso e Responsabilidade</h1>
          <p className="text-sm text-muted-foreground mt-1">Leia e aceite os termos abaixo para acessar o sistema</p>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Termos de Uso */}
          <div>
            <h2 className="text-lg font-bold text-card-foreground mb-3">1. Termos de Uso do Sistema</h2>
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground space-y-3 border border-border">
              <p><strong>1.1.</strong> Este sistema é de uso exclusivo e confidencial da Audipreve Contabilidade e de seus colaboradores devidamente autorizados.</p>
              <p><strong>1.2.</strong> O acesso ao sistema é pessoal e intransferível, sendo o usuário integralmente responsável por todas as ações realizadas com suas credenciais.</p>
              <p><strong>1.3.</strong> É terminantemente proibido compartilhar credenciais de acesso (login e senha) com terceiros, sob qualquer circunstância.</p>
              <p><strong>1.4.</strong> O usuário compromete-se a utilizar o sistema exclusivamente para as finalidades profissionais relacionadas às atividades da Audipreve Contabilidade.</p>
              <p><strong>1.5.</strong> Qualquer uso indevido, tentativa de acesso não autorizado ou violação dos termos poderá resultar em suspensão imediata do acesso e aplicação das sanções legais cabíveis.</p>
              <p><strong>1.6.</strong> A Audipreve Contabilidade reserva-se o direito de monitorar, registrar e auditar todas as atividades realizadas no sistema para fins de segurança e conformidade.</p>
              <p><strong>1.7.</strong> O sistema pode ser atualizado, modificado ou descontinuado a qualquer momento, mediante aviso prévio aos usuários.</p>
            </div>
          </div>

          {/* Termos LGPD */}
          <div>
            <h2 className="text-lg font-bold text-card-foreground mb-3">2. Termo de Responsabilidade — LGPD e Sigilo de Informações</h2>
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground space-y-3 border border-border">
              <p><strong>2.1.</strong> Em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD) e demais normas aplicáveis, o usuário declara ciência e compromisso com as seguintes obrigações:</p>
              <p><strong>2.2. Sigilo e Confidencialidade:</strong> Todas as informações acessadas por meio deste sistema — incluindo, mas não se limitando a, dados pessoais, dados sensíveis, informações financeiras, fiscais e societárias de clientes — são estritamente confidenciais. O usuário obriga-se a manter sigilo absoluto sobre tais informações durante e após o término de sua relação com a Audipreve Contabilidade.</p>
              <p><strong>2.3. Finalidade e Necessidade:</strong> Os dados pessoais e informações disponíveis no sistema devem ser acessados e utilizados exclusivamente para a finalidade específica das atividades profissionais, respeitando os princípios da necessidade e adequação previstos na LGPD.</p>
              <p><strong>2.4. Proibição de Compartilhamento:</strong> É expressamente vedado copiar, transferir, transmitir, divulgar ou compartilhar qualquer dado pessoal ou informação confidencial obtida por meio do sistema com terceiros não autorizados, seja por meio eletrônico, impresso ou verbal.</p>
              <p><strong>2.5. Incidentes de Segurança:</strong> O usuário compromete-se a comunicar imediatamente à administração da Audipreve Contabilidade qualquer incidente de segurança, violação de dados ou suspeita de acesso indevido de que tenha conhecimento.</p>
              <p><strong>2.6. Responsabilidade:</strong> O descumprimento das obrigações previstas neste termo sujeitará o usuário às penalidades previstas na LGPD, no Código Civil, na legislação trabalhista e demais normas aplicáveis, incluindo responsabilização por perdas e danos, sem prejuízo das sanções administrativas e disciplinares cabíveis.</p>
              <p><strong>2.7. Consentimento:</strong> Ao aceitar este termo, o usuário consente com o tratamento de seus dados pessoais (nome, CPF, e-mail, telefone, endereço) pela Audipreve Contabilidade para fins de gestão do acesso ao sistema, controle de atividades e cumprimento de obrigações legais e regulatórias.</p>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-border space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 rounded border-border" />
            <span className="text-sm text-card-foreground">Li e aceito os <strong>Termos de Uso do Sistema</strong> descritos acima.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={acceptedLgpd} onChange={e => setAcceptedLgpd(e.target.checked)} className="mt-1 rounded border-border" />
            <span className="text-sm text-card-foreground">Li e aceito o <strong>Termo de Responsabilidade — LGPD e Sigilo de Informações</strong>, comprometendo-me com o sigilo e a proteção dos dados acessados.</span>
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
