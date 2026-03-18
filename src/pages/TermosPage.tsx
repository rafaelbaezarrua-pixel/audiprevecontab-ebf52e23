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
            <h2 className="text-lg font-bold text-card-foreground mb-3">1. Termos de Uso do Sistema</h2>
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground space-y-3 border border-border">
              <p><strong>1.1. Natureza do Sistema:</strong> Este sistema é uma ferramenta de trabalho de propriedade exclusiva e confidencial da Audipreve Contabilidade, destinado estritamente a colaboradores e parceiros devidamente autorizados.</p>
              <p><strong>1.2. Credenciais de Acesso:</strong> O acesso é pessoal, nominal e intransferível. O usuário é o único e integral responsável por toda e qualquer operação realizada sob suas credenciais (login e senha).</p>
              <p><strong>1.3. Proibição de Compartilhamento:</strong> É terminantemente proibido o compartilhamento de credenciais com terceiros, inclusive outros colaboradores, sob qualquer pretexto. A guarda da senha é de responsabilidade exclusiva do usuário.</p>
              <p><strong>1.4. Finalidade Profissional:</strong> O usuário compromete-se a utilizar o sistema e seus recursos exclusivamente para a execução de suas atividades profissionais em prol da Audipreve Contabilidade, sendo vedado o uso para fins pessoais ou estranhos ao serviço.</p>
              <p><strong>1.5. Sanções por Uso Indevido:</strong> Qualquer tentativa de violação, acesso não autorizado ou uso em desacordo com estes termos resultará na suspensão imediata das credenciais, sem prejuízo da aplicação de sanções disciplinares (conforme a CLT) e medidas judiciais cabíveis.</p>
              <p><strong>1.6. Monitoramento e Auditoria:</strong> A Audipreve Contabilidade reserva-se o direito de monitorar, registrar e auditar os logs de acesso e as atividades realizadas no sistema. O usuário declara ciência de que não há expectativa de privacidade quanto às ações executadas em ambiente corporativo.</p>
              <p><strong>1.7. Manutenção e Alterações:</strong> O sistema poderá sofrer atualizações, modificações ou interrupções para manutenção, buscando sempre a melhoria da segurança e funcionalidade.</p>
            </div>
          </div>

          {/* Termos LGPD */}
          <div>
            <h2 className="text-lg font-bold text-card-foreground mb-3">2. Termo de Responsabilidade — LGPD e Sigilo de Informações</h2>
            <div className="bg-muted/30 rounded-lg p-4 text-sm text-foreground space-y-3 border border-border">
              <p><strong>2.1. Conformidade Legal:</strong> O usuário declara ciência e obriga-se a cumprir as disposições da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD), bem como as normas éticas do Conselho Federal de Contabilidade (CFC).</p>
              <p><strong>2.2. Dever de Sigilo e Confidencialidade:</strong> Todas as informações acessadas — dados pessoais, dados sensíveis, segredos de negócio, dados financeiros, fiscais e societários de clientes — são estritamente confidenciais. Este dever de sigilo permanece em vigor mesmo após o término do vínculo (trabalhista ou contratual) com a Audipreve Contabilidade, sob pena de responsabilização civil e criminal.</p>
              <p><strong>2.3. Princípios da LGPD:</strong> O tratamento de dados deve observar rigorosamente os princípios da finalidade, necessidade e adequação. O acesso a dados de clientes só deve ocorrer quando indispensável para o cumprimento da obrigação profissional específica.</p>
              <p><strong>2.4. Vedação de Extração de Dados:</strong> É expressamente proibido copiar, fotografar, imprimir, transferir ou transmitir qualquer dado confidencial para dispositivos externos (pen drives, e-mails pessoais, nuvens privadas ou aplicativos de mensagens) sem autorização prévia e formal da diretoria.</p>
              <p><strong>2.5. Notificação de Incidentes:</strong> O usuário deve comunicar imediatamente ao Encarregado de Dados (DPO) ou à administração qualquer suspeita de vazamento, perda de dados ou acesso indevido por terceiros.</p>
              <p><strong>2.6. Responsabilidade e Penalidades:</strong> O descumprimento das obrigações aqui previstas sujeitará o infrator a:</p>
              <ul className="list-disc list-inside pl-4 space-y-1">
                <li><strong>Esfera Trabalhista:</strong> Advertência, suspensão ou dispensa por justa causa (Art. 482 da CLT).</li>
                <li><strong>Esfera Civil:</strong> Reparação de danos e perdas causadas à empresa ou a terceiros.</li>
                <li><strong>Esfera Criminal:</strong> Penalidades previstas no Código Penal (Violação de sigilo profissional).</li>
              </ul>
              <p><strong>2.7. Consentimento e Tratamento de Dados do Usuário:</strong> Ao acessar o sistema, o usuário consente com a coleta e tratamento de seus próprios dados (nome, CPF, logs de IP e geolocalização) pela Audipreve Contabilidade, necessários para a segurança da informação, controle de acesso e cumprimento de obrigações legais.</p>
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
