// საღამოს ანგარიში: ჯერ ჩანაწერები (ცხრილი ნახატებით), მერე ბავშვი თვითონ ითვლის
// შემოსავალს, ხარჯს და მოგებას/ზარალს, ბოლოს მოწმდება და იხსნება შემდეგი დღე.
import { S, t } from '../../i18n/strings.ka';
import { store } from '../../core/store';
import { PRODUCTS, STOCK, type ProductId, type StockId } from '../../config/economy';
import { finishDay, makeReport, type Report, type ReportRow } from '../../logic/day';
import { listSumProblem, partSumProblems, profitProblem } from '../../logic/math/generator';
import { play } from '../../audio/sfx';
import { askProblem } from '../mathModal';
import { button, h, img } from '../dom';
import { questList } from '../quests';
import { burstAt, go } from '../layers';
import { openShop } from './shop';

type Step = 'revenue' | 'expenses' | 'profit';

export function reportScreen(): HTMLElement {
  const root = h('div', { class: 'overlay interactive' });
  // kid — ბავშვმა დაითვალა; auto — დიდი რიცხვები (კალკულატორი); given — ერთი რიცხვია, შესაკრები არაფერია;
  // parts — ჯამი კლასის ფარგლებს სცდება: ნაწილები ბავშვმა დაითვალა, დიდი ჯამი — კალკულატორმა
  const done: Partial<Record<Step, 'kid' | 'auto' | 'given' | 'parts'>> = {};
  const skipped = (terms: number[]) => (terms.filter((x) => x > 0).length < 2 ? 'given' : 'auto');
  let finished = false;

  const info = (text: string) => {
    const pop = h('div', { class: 'info-pop', hidden: true }, text);
    const b = h('button', { class: 'info-btn', 'aria-label': 'ⓘ', onClick: () => { pop.hidden = !pop.hidden; } }, 'i');
    return { b, pop };
  };

  const table = (rows: ReportRow[], icon: (id: string) => string, name: (r: ReportRow) => string, extra: Node[]) =>
    h('table', { class: 'ledger' }, h('tbody', null,
      ...rows.map((r) => h('tr', { class: r.emergency ? 'emergency' : '' },
        h('td', null, img(icon(r.id))), h('td', null, name(r)),
        h('td', { class: 'num' }, `${r.qty} × ${r.price} ₾`), h('td', { class: 'num' }, `= ${r.sum} ₾`))),
      ...extra,
    ));

  const result = (step: Step, value: number, label: string) => {
    const v = done[step];
    return h('div', { class: `result ${v ? 'filled' : ''}` },
      h('span', null, `${label} =`),
      h('b', null, v ? `${value} ₾` : '? ₾'),
      v === 'auto' && value > 0 ? h('small', { class: 'hint' }, S.report.auto) : '',
      v === 'parts' ? h('small', { class: 'hint' }, S.report.parts) : '',
    );
  };

  const render = () => {
    const p = store.get();
    const today = p.today;
    if (!today) { go('menu'); return; }
    const R: Report = makeReport(today, today.grade ?? p.grade);
    const iR = info(S.report.info.revenue), iE = info(S.report.info.expenses), iP = info(S.report.info.profit);
    const loss = R.profit < 0;

    const countBtn = (step: Step, enabled: boolean, run: () => Promise<void>) =>
      done[step] ? '' : h('button', { class: 'btn green', disabled: !enabled, onClick: () => void run() }, img('icon_menu_book'), S.report.count);

    const revenueTerms = [...R.revenueRows.map((r) => r.sum), R.tips, R.branch];
    const expenseTerms = [...R.expenseRows.map((r) => r.sum), R.rent];

    /** ჯამი: ბავშვი კრებს მთლიანად; კლასის ფარგლებს თუ სცდება — ნაწილ-ნაწილ (1 კლასი: 20-მდე); თორემ კალკულატორი. */
    const countSum = async (terms: number[], kind: 'revenue' | 'expenses', title: string) => {
      const grade = today.grade ?? p.grade;
      const pr = listSumProblem(terms, kind, grade);
      if (pr) { await askProblem(title, pr, { cancellable: false }); return 'kid' as const; }
      const parts = partSumProblems(terms, grade);
      for (const part of parts) await askProblem(title, part, { cancellable: false });
      return parts.length ? 'parts' as const : skipped(terms);
    };
    const runRevenue = async () => {
      done.revenue = R.discount ? 'auto' : await countSum(revenueTerms, 'revenue', S.report.revenue);
      play('coin');
      render();
    };
    const runExpenses = async () => {
      done.expenses = await countSum(expenseTerms, 'expenses', S.report.expenses);
      play('coin');
      render();
    };
    const runProfit = async () => {
      const pr = profitProblem(R.revenue, R.expenses, today.grade ?? p.grade);
      if (pr) { await askProblem(loss ? S.report.loss : S.report.profit, pr, { cancellable: false }); done.profit = 'kid'; } else done.profit = 'auto';
      play(loss ? 'coin' : 'levelUp');
      render();
    };

    const revenueCard = h('section', { class: 'card ledger-card' },
      h('h3', null, img('coin'), S.report.revenue, iR.b), iR.pop,
      h('p', { class: 'hint' }, S.report.formulaRevenue),
      R.revenueRows.length || R.branch ? table(R.revenueRows, (id) => PRODUCTS[id as ProductId].icon, (r) => S.products[r.id], [
        R.branch ? h('tr', null, h('td', null, img('icon_store')), h('td', null, S.report.branch), h('td'), h('td', { class: 'num' }, `+ ${R.branch} ₾`)) : '',
        R.tips ? h('tr', null, h('td', null, img('icon_sparkle')), h('td', null, S.report.tips), h('td'), h('td', { class: 'num' }, `+ ${R.tips} ₾`)) : '',
        R.discount ? h('tr', null, h('td', null, img('icon_check')), h('td', null, S.report.discount), h('td'), h('td', { class: 'num' }, `− ${R.discount} ₾`)) : '',
      ].filter(Boolean) as Node[]) : h('p', { class: 'hint' }, S.report.noSales),
      result('revenue', R.revenue, S.report.revenue),
      countBtn('revenue', true, runRevenue),
    );

    const expenseCard = h('section', { class: 'card ledger-card' },
      h('h3', null, img('icon_box'), S.report.expenses, iE.b), iE.pop,
      h('p', { class: 'hint' }, S.report.formulaExpenses),
      table(R.expenseRows, (id) => STOCK[id as StockId].icon, (r) => (r.emergency ? `${S.stock[r.id]} (${S.report.emergency})` : S.stock[r.id]), [
        h('tr', null, h('td', null, img('icon_store')), h('td', null, S.report.rent), h('td'), h('td', { class: 'num' }, `= ${R.rent} ₾`)),
      ]),
      R.expenseRows.length ? '' : h('p', { class: 'hint' }, S.report.noPurchases),
      result('expenses', R.expenses, S.report.expenses),
      countBtn('expenses', !!done.revenue, runExpenses),
    );

    const profitCard = h('section', { class: `card ledger-card ${done.profit ? (loss ? 'loss' : 'profit') : ''}` },
      h('h3', null, img(loss && done.profit ? 'icon_heart' : 'star'), loss && done.profit ? S.report.loss : S.report.profit, iP.b), iP.pop,
      h('p', { class: 'hint' }, S.report.formulaProfit),
      result('profit', Math.abs(R.profit), loss && done.profit ? S.report.loss : S.report.profit),
      done.profit ? h('p', { class: `feedback ${loss ? 'try' : 'good'}` }, loss ? S.report.lossGentle : S.report.profitGood) : '',
      countBtn('profit', !!done.revenue && !!done.expenses, runProfit),
    );

    let finale: Node | string = '';
    if (done.profit) {
      const goalMet = today.revenue >= today.goal;
      const stats = h('div', { class: 'info-strip' },
        h('span', { class: 'chip' }, img('icon_people'), `${S.report.served}: ${today.served}`),
        h('span', { class: 'chip' }, img(`customer_vano_angry`), `${S.report.left}: ${today.left}`),
        h('span', { class: 'chip' }, img('icon_trash'), `${S.report.wasted}: ${today.wasted}`),
        today.missed ? h('span', { class: 'chip lock' }, img('icon_box'), `${S.report.missed}: ${today.missed}`) : '',
      );
      const outs = today.stockouts ?? [];
      const stockTip = outs.length ? h('p', { class: 'stock-tip' }, img('icon_box'), t(S.report.stockTip, { names: outs.map((x) => S.stock[x]).join(', ') })) : '';
      const msg = h('p', { class: `feedback ${goalMet ? 'good' : 'try'}` },
        goalMet ? t(S.report.goalMet, { n: p.day + 1 }) : t(S.report.goalMiss, { n: today.goal - today.revenue, d: p.day }));
      finale = h('section', { class: 'card ledger-card wide' }, stats, stockTip, today.quests?.length ? questList(p, 'report-quests') : '', msg,
        h('div', { class: 'row', style: 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center' },
          button(goalMet ? S.report.next : S.report.retry, () => close('menu'), 'green big', goalMet ? 'icon_level_up' : 'icon_clock'),
          button(S.report.shop, () => close('shop'), 'big', 'icon_store'),
        ));
      if (goalMet) window.setTimeout(() => burstAt(msg as HTMLElement, 14), 150);
    }

    root.replaceChildren(h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, img('icon_calendar'), h('h2', null, t(S.report.title, { n: today.day }))),
      h('div', { class: 'panel-body' },
        h('p', { class: 'hint', style: 'margin:0 0 12px;font-size:17px' }, S.report.intro),
        h('div', { class: 'report-grid' }, revenueCard, expenseCard, profitCard, finale),
      ),
    ));
  };

  /** ქირის გადახდა, ისტორია, შემდეგი დღე — ერთხელ. */
  const close = (to: 'menu' | 'shop') => {
    if (!finished) {
      finished = true;
      store.update((q) => { finishDay(q); });
    }
    if (to === 'shop') openShop('equipment');
    else go('menu');
  };

  render();
  return root;
}
