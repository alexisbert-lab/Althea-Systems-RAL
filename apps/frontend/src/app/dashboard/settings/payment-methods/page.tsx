'use client';

import { useEffect, useState, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useAuthentificationStore } from '@/stores/authentification-store';
import { useTheme } from 'next-themes';
import { api } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CreditCard, Trash2, Star, Plus, Lock } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const brandLabels: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  diners: 'Diners Club',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

/* ---------- Add Card Form (child of Elements provider) ---------- */
function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: submitError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (submitError) {
      setError(submitError.message || 'Erreur lors de l\'ajout de la carte.');
      setLoading(false);
    } else {
      toast.success('Carte ajoutée avec succès.');
      onSuccess();
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-althea-cta/20 bg-althea-bg/30 p-3">
        <p className="text-xs text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3" /> Vos informations sont transmises de manière sécurisée via Stripe.
        </p>
      </div>
      <PaymentElement />
      {error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="bg-althea-cta text-white hover:bg-althea-hover"
      >
        {loading ? 'Ajout en cours...' : 'Ajouter la carte'}
      </Button>
    </form>
  );
}

/* ---------- Payment Methods Page ---------- */
export default function PaymentMethodsPage() {
  const { token } = useAuthentificationStore();
  const { resolvedTheme } = useTheme();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    if (!token) return;
    setLoadingMethods(true);
    try {
      const data = await api.get<PaymentMethod[]>('/api/payments/methods', token);
      setMethods(data);
    } catch {
      // No saved methods yet or Stripe not configured
      setMethods([]);
    } finally {
      setLoadingMethods(false);
    }
  }, [token]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const handleShowAddForm = async () => {
    try {
      const { clientSecret } = await api.post<{ clientSecret: string }>(
        '/api/payments/methods/setup',
        {},
        token!,
      );
      setSetupClientSecret(clientSecret);
      setShowAddForm(true);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la création du formulaire.');
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setSetupClientSecret(null);
    loadMethods();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette carte ?')) return;
    setActionLoading(id);
    try {
      await api.delete(`/api/payments/methods/${id}`, token!);
      toast.success('Carte supprimée.');
      loadMethods();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setActionLoading(id);
    try {
      await api.put(`/api/payments/methods/${id}/default`, {}, token!);
      toast.success('Carte définie par défaut.');
      loadMethods();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Méthodes de paiement</h2>
        {!showAddForm && (
          <Button
            onClick={handleShowAddForm}
            className="bg-althea-cta text-white hover:bg-althea-hover"
          >
            <Plus className="mr-1 h-4 w-4" /> Ajouter une carte
          </Button>
        )}
      </div>

      {/* Add card form */}
      {showAddForm && setupClientSecret && (
        <div className="max-w-lg rounded-xl border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-poppins text-lg font-semibold">Nouvelle carte</h3>
            <button
              onClick={() => {
                setShowAddForm(false);
                setSetupClientSecret(null);
              }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          </div>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: setupClientSecret,
              appearance: {
                theme: resolvedTheme === 'dark' ? 'night' : 'stripe',
                variables: {
                  colorPrimary: '#00a8b5',
                  ...(resolvedTheme === 'dark' && {
                    colorBackground: '#1a1a2e',
                    colorText: '#e2e8f0',
                  }),
                },
              },
              locale: 'fr',
            }}
          >
            <AddCardForm onSuccess={handleAddSuccess} />
          </Elements>
        </div>
      )}

      {/* Saved cards list */}
      {loadingMethods ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-althea-cta border-t-transparent" />
        </div>
      ) : methods.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune carte enregistrée.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez une carte pour accélérer vos futurs achats.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((pm) => (
            <div
              key={pm.id}
              className={`relative rounded-xl border bg-card p-5 transition-colors ${
                pm.isDefault ? 'border-althea-cta' : ''
              }`}
            >
              {pm.isDefault && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-althea-cta/10 px-2 py-0.5 text-xs font-medium text-althea-cta">
                  <Star className="h-3 w-3" /> Par défaut
                </span>
              )}
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold">
                    {brandLabels[pm.brand] || pm.brand} •••• {pm.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expire {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {!pm.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetDefault(pm.id)}
                    disabled={actionLoading === pm.id}
                  >
                    <Star className="mr-1 h-3 w-3" /> Par défaut
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(pm.id)}
                  disabled={actionLoading === pm.id}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
