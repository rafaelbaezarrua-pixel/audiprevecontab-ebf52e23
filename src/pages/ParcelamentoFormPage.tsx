import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const tiposParcelamento = [
    "Previdenciário",
    "Simples Nacional",
    "MEI",
    "IRPF",
    "Dívida Ativa",
    "ICMS",
    "Outros",
];

const calcPrevisao = (dataInicio: string, qtd: number) => {
    if (!dataInicio || !qtd) return "";
    const d = new Date(dataInicio);
    d.setMonth(d.getMonth() + qtd);
    return d.toISOString().slice(0, 10);
};

const ParcelamentoFormPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        tipo_pessoa: "empresa",
        nome_pessoa_fisica: "",
        cpf_pessoa_fisica: "",
        tipo_parcelamento: "Simples Nacional",
        data_inicio: "",
        qtd_parcelas: "",
        forma_envio: "",
        metodo_login: "procuracao",
        login_gov_br: "",
        senha_gov_br: "",
        codigo_sn: "",
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nome_pessoa_fisica.trim()) {
            toast.error("Nome é obrigatório");
            return;
        }

        setLoading(true);
        const qtd = parseInt(form.qtd_parcelas) || 0;
        const payload = {
            tipo_pessoa: form.tipo_pessoa,
            nome_pessoa_fisica: form.nome_pessoa_fisica,
            cpf_pessoa_fisica: form.cpf_pessoa_fisica || null,
            tipo_parcelamento: form.tipo_parcelamento,
            data_inicio: form.data_inicio || null,
            qtd_parcelas: qtd,
            previsao_termino: calcPrevisao(form.data_inicio, qtd) || null,
            forma_envio: form.forma_envio || null,
            metodo_login: form.metodo_login,
            login_gov_br: form.metodo_login === "gov_br" ? form.login_gov_br : null,
            senha_gov_br: form.metodo_login === "gov_br" ? form.senha_gov_br : null,
            codigo_sn: form.metodo_login === "codigo_sn" ? form.codigo_sn : null,
        };

        try {
            const { error } = await supabase.from("parcelamentos").insert(payload);
            if (error) throw error;
            toast.success("Parcelamento cadastrado com sucesso!");
            navigate("/parcelamentos");
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar");
        } finally {
            setLoading(false);
        }
    };

    const inputCls =
        "w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none transition-all";
    const labelCls = "block text-sm font-semibold text-card-foreground mb-1.5";

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-card-foreground transition-colors"
                >
                    <ArrowLeft size={18} />
                </button>
            </div>

            <div className="module-card p-6 md:p-8">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold border-b border-border pb-2 text-foreground">
                            Dados Gerais
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Tipo de Cadastro</label>
                                <select
                                    value={form.tipo_pessoa}
                                    onChange={(e) =>
                                        setForm({ ...form, tipo_pessoa: e.target.value })
                                    }
                                    className={inputCls}
                                >
                                    <option value="empresa">Empresa (PJ)</option>
                                    <option value="pessoa_fisica">Pessoa Física (PF)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelCls}>Nome ou Razão Social *</label>
                                <input
                                    required
                                    value={form.nome_pessoa_fisica}
                                    onChange={(e) =>
                                        setForm({ ...form, nome_pessoa_fisica: e.target.value })
                                    }
                                    className={inputCls}
                                    placeholder="Nome do cliente"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>
                                    {form.tipo_pessoa === "empresa" ? "CNPJ" : "CPF"}
                                </label>
                                <input
                                    value={form.cpf_pessoa_fisica}
                                    onChange={(e) =>
                                        setForm({ ...form, cpf_pessoa_fisica: e.target.value })
                                    }
                                    className={inputCls}
                                    placeholder="Apenas números"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Tipo de Parcelamento</label>
                                <select
                                    value={form.tipo_parcelamento}
                                    onChange={(e) =>
                                        setForm({ ...form, tipo_parcelamento: e.target.value })
                                    }
                                    className={inputCls}
                                >
                                    {tiposParcelamento.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Data de Início</label>
                                <input
                                    type="date"
                                    value={form.data_inicio}
                                    onChange={(e) =>
                                        setForm({ ...form, data_inicio: e.target.value })
                                    }
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Quantidade de Parcelas</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.qtd_parcelas}
                                    onChange={(e) =>
                                        setForm({ ...form, qtd_parcelas: e.target.value })
                                    }
                                    className={inputCls}
                                    placeholder="Ex: 60"
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Forma de Envio Padrão</label>
                                <input
                                    value={form.forma_envio}
                                    onChange={(e) =>
                                        setForm({ ...form, forma_envio: e.target.value })
                                    }
                                    className={inputCls}
                                    placeholder="Ex: WhatsApp, Email..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-lg font-bold border-b border-border pb-2 text-foreground">
                            Acesso e Login
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelCls}>Método de Login</label>
                                <select
                                    value={form.metodo_login}
                                    onChange={(e) =>
                                        setForm({ ...form, metodo_login: e.target.value })
                                    }
                                    className={inputCls}
                                >
                                    <option value="procuracao">Por Procuração / Certificado</option>
                                    <option value="gov_br">Acesso Gov.br</option>
                                    <option value="codigo_sn">Código de Acesso Simples Nacional</option>
                                </select>
                            </div>

                            {form.metodo_login === "gov_br" && (
                                <>
                                    <div className="animate-fade-in">
                                        <label className={labelCls}>Login (CPF Gov.br)</label>
                                        <input
                                            required
                                            value={form.login_gov_br}
                                            onChange={(e) =>
                                                setForm({ ...form, login_gov_br: e.target.value })
                                            }
                                            className={inputCls}
                                            placeholder="CPF de acesso"
                                        />
                                    </div>
                                    <div className="animate-fade-in">
                                        <label className={labelCls}>Senha (Gov.br)</label>
                                        <input
                                            required
                                            type="password"
                                            value={form.senha_gov_br}
                                            onChange={(e) =>
                                                setForm({ ...form, senha_gov_br: e.target.value })
                                            }
                                            className={inputCls}
                                            placeholder="Senha do gov.br"
                                        />
                                    </div>
                                </>
                            )}

                            {form.metodo_login === "codigo_sn" && (
                                <div className="md:col-span-2 animate-fade-in">
                                    <label className={labelCls}>Código de Acesso SN</label>
                                    <input
                                        required
                                        value={form.codigo_sn}
                                        onChange={(e) =>
                                            setForm({ ...form, codigo_sn: e.target.value })
                                        }
                                        className={inputCls}
                                        placeholder="Ex: 123456789012"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={() => navigate("-1")}
                            className="px-5 py-2.5 text-sm font-semibold text-muted-foreground bg-muted hover:bg-muted/80 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-primary-foreground rounded-xl shadow-md disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
                            style={{ background: "var(--gradient-primary)" }}
                        >
                            {loading ? (
                                "Salvando..."
                            ) : (
                                <>
                                    <Save size={18} /> Salvar Parcelamento
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ParcelamentoFormPage;
