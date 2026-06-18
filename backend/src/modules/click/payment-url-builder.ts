// CLICK redirect URL builder. The cart checkout returns this string and the
// SPA window.location.href's to it. CLICK then renders its own card-entry
// form, hits our Prepare + Complete webhooks, and finally redirects back to
// return_url with the order_id intact for our PaymentResultPage to poll.
//
//   https://my.click.uz/services/pay
//     ?service_id=<X>          ← per-clinic service id (public)
//     &merchant_id=<Y>         ← merchant id (public)
//     &amount=<som>            ← decimal som (CLICK uses som, not tiyin)
//     &transaction_param=<id>  ← our appointment uuid; becomes merchant_trans_id
//     &return_url=<url>        ← URL CLICK redirects the user back to
//     &card_type=              ← optional ("uzcard"/"humo"); blank lets user pick

export interface BuildOpts {
    serviceId: string;
    merchantId: string;
    amount: number;          // som — integer is fine, CLICK accepts whole-number amounts
    appointmentId: string;
    returnUrl: string;
    cardType?: 'uzcard' | 'humo';
}

const CLICK_PAY_HOST = 'https://my.click.uz/services/pay';

export function buildPaymentUrl(opts: BuildOpts): string {
    const params = new URLSearchParams({
        service_id: opts.serviceId,
        merchant_id: opts.merchantId,
        amount: String(opts.amount),
        transaction_param: opts.appointmentId,
        return_url: opts.returnUrl,
    });
    if (opts.cardType) params.set('card_type', opts.cardType);
    return `${CLICK_PAY_HOST}?${params.toString()}`;
}
