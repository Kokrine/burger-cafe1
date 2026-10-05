// მასწავლებლის პანელი: კლასები, კლასის კოდი, მოსწავლეები (ქულები, სიზუსტე
// ოპერაციების მიხედვით, ბოლო აქტივობა), PIN-ის აღდგენა.
import { S, t } from '../../i18n/strings.ka';
import { backend } from '../../data';
import type { ClassInfo, StudentSummary } from '../../data/backend';
import { currentSession, signOut } from '../../core/auth';
import type { Grade, Op } from '../../core/types';
import { button, h, img } from '../dom';
import { go, toast } from '../layers';

const OPS: Op[] = ['add', 'sub', 'mul', 'div'];
const T = S.teacherPanel;

function lastActive(iso: string | null): string {
  if (!iso) return T.never;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? T.today : t(T.daysAgo, { n: days });
}

function accuracyCell(s: StudentSummary): HTMLElement {
  return h('div', { class: 'acc' }, ...OPS.map((op) => {
    const a = s.accuracy[op];
    const pct = a.attempts ? Math.round((a.firstTry / a.attempts) * 100) : null;
    const tone = pct === null ? 'none' : pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
    return h('div', { class: `acc-row ${tone}`, title: `${a.firstTry}/${a.attempts}` },
      h('b', null, T.ops[op]),
      h('div', { class: 'acc-bar' }, h('i', { style: `width:${pct ?? 0}%` })),
      h('span', null, pct === null ? '—' : `${pct}%`));
  }));
}

export function teacherScreen(): HTMLElement {
  const root = h('div', { class: 'overlay interactive teacher' });
  const session = currentSession();
  let classes: ClassInfo[] = [];
  let selected: string | null = null;
  let rows: StudentSummary[] = [];
  let notice = '';

  const load = async () => {
    classes = await backend.listClasses();
    if (!selected || !classes.some((c) => c.id === selected)) selected = classes[0]?.id ?? null;
    rows = selected ? await backend.classOverview(selected) : [];
    render();
  };

  const classPanel = (c: ClassInfo): HTMLElement => {
    const nick = h('input', { class: 'field', maxlength: '30', placeholder: T.nickname, 'aria-label': T.nickname });
    const add = async () => {
      try {
        const { student, pin } = await backend.addStudent(c.id, nick.value);
        notice = t(T.pinShown, { name: student.nickname, pin });
        await load();
      } catch {
        toast(S.login.errors['bad-input'], 'icon_lock');
      }
    };
    nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') void add(); });
    const copyCode = () => {
      void navigator.clipboard?.writeText(c.code).then(() => toast(T.copied, 'icon_check'), () => undefined);
    };
    return h('section', { class: 'card class-card' },
      h('div', { class: 'class-head' },
        h('div', null,
          h('h3', null, c.name),
          h('div', { class: 'grade-pick' }, h('span', null, `${T.grade}:`),
            ...([1, 2, 3, 4] as Grade[]).map((g) => h('button', {
              class: `opt grade ${c.grade === g ? 'on' : ''}`,
              onClick: async () => { await backend.setClassGrade(c.id, g); await load(); },
            }, t(T.gradeN, { n: g })))),
        ),
        h('div', { class: 'code-box' }, h('small', null, T.code), h('b', null, c.code),
          button(T.copy, copyCode, 'white'), h('small', null, T.codeHint)),
      ),
      notice ? h('p', { class: 'pin-notice', role: 'status' }, img('icon_lock'), notice) : '',
      h('div', { class: 'add-row' }, nick, button(T.add, () => void add(), 'green', 'icon_chef_hat')),
      h('p', { class: 'hint' }, T.privacy),
      h('h3', null, t(T.students, { n: rows.length }),
        h('button', { class: 'link-btn', onClick: () => void load() }, T.refresh)),
      rows.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'students' },
        h('thead', null, h('tr', null, ...[T.cols.name, T.cols.points, T.cols.stars, T.cols.day, T.cols.level, T.cols.badges, T.cols.accuracy, T.cols.last, T.cols.actions].map((x) => h('th', null, x)))),
        h('tbody', null, ...rows.map((s) => h('tr', null,
          h('td', { class: 'name' }, s.nickname),
          h('td', null, String(s.points)),
          h('td', null, String(s.stars)),
          h('td', null, String(s.day)),
          h('td', null, String(s.cafeLevel)),
          h('td', null, String(s.badges)),
          h('td', null, accuracyCell(s)),
          h('td', null, lastActive(s.lastActive)),
          h('td', { class: 'actions' },
            button(T.resetPin, async () => {
              if (!window.confirm(t(T.resetConfirm, { name: s.nickname }))) return;
              const pin = await backend.resetPin(s.id);
              notice = t(T.pinShown, { name: s.nickname, pin });
              render();
            }, 'teal'),
            button(T.remove, async () => {
              if (!window.confirm(t(T.removeConfirm, { name: s.nickname }))) return;
              await backend.removeStudent(s.id);
              notice = '';
              await load();
            }, 'red'),
          ),
        ))),
      )) : h('p', { class: 'hint' }, T.empty),
    );
  };

  const render = () => {
    const name = h('input', { class: 'field', maxlength: '40', placeholder: T.className, 'aria-label': T.className });
    let grade: Grade = 2;
    const gradeBtns = h('div', { class: 'grade-pick' }, ...([1, 2, 3, 4] as Grade[]).map((g) => h('button', {
      class: `opt grade ${g === grade ? 'on' : ''}`,
      onClick: (e: MouseEvent) => {
        grade = g;
        for (const b of gradeBtns.querySelectorAll('button')) b.classList.remove('on');
        (e.currentTarget as HTMLElement).classList.add('on');
      },
    }, String(g))));
    const create = async () => {
      try {
        const c = await backend.createClass(name.value, grade);
        selected = c.id;
        notice = '';
        await load();
      } catch {
        toast(S.login.errors['bad-input'], 'icon_lock');
      }
    };
    const current = classes.find((c) => c.id === selected);
    root.replaceChildren(h('div', { class: 'panel teacher-panel' },
      h('div', { class: 'panel-head' }, img('icon_menu_book'), h('h2', null, T.title),
        h('span', { class: 'chip' }, session?.kind === 'teacher' ? session.teacher.email : ''),
        button(T.logout, async () => { await signOut(); go('login'); }, 'white')),
      h('div', { class: 'panel-body teacher-layout' },
        h('aside', { class: 'card class-list' },
          h('h3', null, T.classes),
          classes.length ? '' : h('p', { class: 'hint' }, T.noClasses),
          ...classes.map((c) => h('button', {
            class: `class-btn ${c.id === selected ? 'on' : ''}`,
            onClick: async () => { selected = c.id; notice = ''; rows = await backend.classOverview(c.id); render(); },
          }, h('b', null, c.name), h('small', null, `${t(T.gradeN, { n: c.grade })} · ${c.code} · ${c.studentCount}`))),
          h('h3', null, T.newClass),
          name, h('small', { class: 'hint' }, T.grade), gradeBtns,
          button(T.create, () => void create(), 'green'),
        ),
        current ? classPanel(current) : h('section', { class: 'card' }, h('p', { class: 'hint' }, T.noClasses)),
      ),
    ));
  };

  render();
  void load();
  return root;
}
