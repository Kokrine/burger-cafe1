// შესვლის ეკრანი. მოსწავლე: კლასის კოდი → სახელი სიიდან → 4-ნიშნა PIN.
// მასწავლებელი: ელფოსტა + პაროლი. ბავშვს ელფოსტა არ სჭირდება.
import { S, t } from '../../i18n/strings.ka';
import { backend } from '../../data';
import { BackendFailure, type Roster, type StudentPublic } from '../../data/backend';
import { DEMO } from '../../data/demo';
import { enterSession } from '../../core/auth';
import { store } from '../../core/store';
import { play } from '../../audio/sfx';
import { button, h, img } from '../dom';
import { go } from '../layers';

type Mode = 'student' | 'teacher';

const errText = (e: unknown) => (e instanceof BackendFailure ? S.login.errors[e.code] : S.login.errors['bad-input']);

export function loginScreen(): HTMLElement {
  const root = h('div', { class: 'overlay interactive' });
  let mode: Mode = 'student';
  let roster: Roster | null = null;
  let picked: StudentPublic | null = null;
  let code = '';
  let pin = '';
  let teacherSignUp = false;
  let error = '';
  let busy = false;

  const afterEnter = () => go(store.get().chef ? 'menu' : 'character');

  const studentView = (): HTMLElement => {
    if (!roster) {
      const input = h('input', {
        class: 'field code-field', value: code, maxlength: '6', autocomplete: 'off', autocapitalize: 'characters',
        'aria-label': S.login.classCode, placeholder: 'ABC123',
        onInput: (e: Event) => { code = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, ''); (e.target as HTMLInputElement).value = code; },
        onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') void loadRoster(); },
      });
      window.setTimeout(() => input.focus(), 50);
      return h('div', { class: 'login-step' },
        h('label', { class: 'field-label' }, S.login.classCode), input,
        h('p', { class: 'hint' }, S.login.codeHint),
        button(S.login.next, () => void loadRoster(), 'green big'),
      );
    }
    if (!picked) {
      return h('div', { class: 'login-step' },
        h('h3', null, `${roster.className} — ${S.login.whoAreYou}`),
        roster.students.length
          ? h('div', { class: 'roster' }, ...roster.students.map((s) => h('button', {
            class: 'btn white roster-btn', onClick: () => { picked = s; pin = ''; error = ''; render(); },
          }, img('icon_chef_hat'), s.nickname)))
          : h('p', { class: 'hint' }, S.login.emptyClass),
        button(S.login.back, () => { roster = null; error = ''; render(); }, 'white'),
      );
    }
    const dots = h('div', { class: 'pin-dots', 'aria-label': S.login.pinHint }, ...[0, 1, 2, 3].map((i) => h('span', { class: i < pin.length ? 'on' : '' })));
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
    return h('div', { class: 'login-step' },
      h('h3', null, t(S.login.enterPin, { name: picked.nickname })),
      dots,
      h('div', { class: 'keypad' }, ...keys.map((k) => button(k, () => {
        if (busy) return;
        if (k === '⌫') pin = pin.slice(0, -1);
        else if (k === '✓') { if (pin.length === 4) void signInStudent(); return; }
        else if (pin.length < 4) pin += k;
        render();
        if (pin.length === 4) void signInStudent();
      }, k === '✓' ? 'green' : k === '⌫' ? 'teal' : 'white'))),
      button(S.login.back, () => { picked = null; pin = ''; error = ''; render(); }, 'white'),
    );
  };

  const teacherView = (): HTMLElement => {
    const email = h('input', { class: 'field', type: 'email', autocomplete: 'username', placeholder: S.login.email, 'aria-label': S.login.email });
    const pass = h('input', {
      class: 'field', type: 'password', autocomplete: teacherSignUp ? 'new-password' : 'current-password', placeholder: S.login.password, 'aria-label': S.login.password,
      onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') void submit(); },
    });
    const submit = async () => {
      if (busy) return;
      busy = true;
      try {
        const teacher = teacherSignUp ? await backend.teacherSignUp(email.value, pass.value) : await backend.teacherSignIn(email.value, pass.value);
        await enterSession({ kind: 'teacher', teacher });
        go('teacher');
      } catch (e) {
        error = errText(e);
        play('wrong');
        render();
      } finally {
        busy = false;
      }
    };
    return h('form', { class: 'login-step', onSubmit: (e: Event) => { e.preventDefault(); void submit(); } },
      email, pass,
      button(teacherSignUp ? S.login.signUp : S.login.signIn, () => void submit(), 'green big'),
      h('button', { type: 'button', class: 'link-btn', onClick: () => { teacherSignUp = !teacherSignUp; error = ''; render(); } },
        teacherSignUp ? S.login.haveAccount : S.login.noAccount),
    );
  };

  const loadRoster = async () => {
    if (busy || code.length < 4) return;
    busy = true;
    try {
      roster = await backend.roster(code);
      error = '';
      play('click');
    } catch (e) {
      error = errText(e);
      play('wrong');
    } finally {
      busy = false;
      render();
    }
  };

  const signInStudent = async () => {
    if (!roster || !picked) return;
    busy = true;
    try {
      const session = await backend.studentSignIn(code, picked.id, pin);
      await enterSession(session);
      play('levelUp');
      afterEnter();
    } catch (e) {
      error = errText(e);
      pin = '';
      play('wrong');
      render();
    } finally {
      busy = false;
    }
  };

  const guest = async () => {
    backend.playAsGuest();
    await enterSession({ kind: 'guest' });
    afterEnter();
  };

  const render = () => {
    root.replaceChildren(h('div', { class: 'panel login bounce-in' },
      h('div', { class: 'panel-head' }, img('menu_burger'), h('h2', null, `${S.appTitle} — ${S.login.title}`)),
      h('div', { class: 'panel-body' },
        h('div', { class: 'login-tabs' },
          h('button', { class: `tab ${mode === 'student' ? 'on' : ''}`, onClick: () => { mode = 'student'; error = ''; render(); } }, img('icon_chef_hat'), S.login.student),
          h('button', { class: `tab ${mode === 'teacher' ? 'on' : ''}`, onClick: () => { mode = 'teacher'; error = ''; render(); } }, img('icon_menu_book'), S.login.teacher),
        ),
        error ? h('p', { class: 'feedback try', role: 'alert' }, error) : '',
        mode === 'student' ? studentView() : teacherView(),
        h('div', { class: 'login-foot' },
          button(S.login.guest, () => void guest(), 'white'),
          h('p', { class: 'hint' }, S.login.guestHint),
          backend.mode === 'offline' ? h('p', { class: 'hint' }, `${S.login.offline} ${t(S.login.demo, { code: DEMO.classCode })}`) : '',
        ),
      ),
    ));
  };

  render();
  return root;
}
