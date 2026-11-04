window.__ModuleLoader__.load({
  id: '@inhuman/dsh-speckit-panel',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect } = React;
    const API = '/api/dsh-speckit-panel';
    const STAGES = [
      ['constitution', 'Constitution', 'speckit-constitution'],
      ['specify', 'Specify', 'speckit-specify'],
      ['clarify', 'Clarify', 'speckit-clarify'],
      ['plan', 'Plan', 'speckit-plan'],
      ['tasks', 'Tasks', 'speckit-tasks'],
      ['analyze', 'Analyze', 'speckit-analyze'],
      ['checklist', 'Checklist', 'speckit-checklist'],
      ['implement', 'Implement', 'speckit-implement'],
    ];
    const css = `
      .sk-page{height:100%;min-height:0;overflow:auto;box-sizing:border-box;padding:14px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:inherit;line-height:1.45}
      .sk-page *{box-sizing:border-box}.sk-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sk-between{justify-content:space-between}.sk-muted{color:var(--dsw-alias-label-secondary);font-size:12px}.sk-title{margin:0;font-size:18px;font-weight:650}
      .sk-button{font:inherit;font-size:12px;line-height:1.3;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:5px 9px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer}
      .sk-button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}.sk-button:disabled{opacity:.5;cursor:default}.sk-primary{border-color:var(--dsw-alias-brand-primary)}
      .sk-card{padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);margin-top:8px}
      .sk-stage{display:flex;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--dsw-alias-border-l1)}.sk-stage:first-child{border-top:0}
      .sk-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary)}.sk-dot[data-ready=true]{background:var(--dsw-alias-state-success-primary)}
      .sk-name{flex:1;min-width:0;font-size:13px}.sk-file{font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
      .sk-input{min-width:0;flex:1;font:inherit;font-size:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:5px 7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
      .sk-pre{max-height:45vh;overflow:auto;margin:8px 0 0;padding:8px;border-radius:6px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);font:11px/1.45 ui-monospace,monospace;white-space:pre-wrap}
      .sk-error{color:var(--dsw-alias-state-error-primary);font-size:12px;white-space:pre-wrap}.sk-bar{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden;margin-top:6px}.sk-bar>span{display:block;height:100%;background:var(--dsw-alias-state-success-primary)}
    `;
    async function api(params, signal) {
      const response = await fetch(`${API}?${new URLSearchParams(params)}`, { credentials: 'same-origin', signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
      return data;
    }
    function Icon(props) {
      return h('svg', { width: props.size ?? 18, height: props.size ?? 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
        h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 4, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M7 8h10M7 12h6M7 16h8', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }));
    }
    function Panel(props) {
      const tab = props.useTabInfo().tab;
      const [state, setState] = useState(null), [error, setError] = useState('');
      const [slug, setSlug] = useState(''), [newSlug, setNewSlug] = useState(''), [file, setFile] = useState(null), [tick, setTick] = useState(0);
      useEffect(() => {
        if (!tab.visible) return;
        const ctl = new AbortController();
        api({ action: 'state', session: props.sessionId }, ctl.signal)
          .then(data => { setState(data); setError(''); setSlug(current => current && data.features.some(f => f.slug === current) ? current : (data.features[0]?.slug ?? '')); })
          .catch(e => { if (!ctl.signal.aborted) setError(e.message); });
        return () => ctl.abort();
      }, [tab.visible, props.sessionId, tick]);
      const active = state?.features.find(f => f.slug === slug) ?? null;
      const specName = active?.files.find(f => f.name === 'spec.md' || f.name === 'specify.md')?.name;
      const has = name => name === 'spec.md' ? Boolean(specName) : (active?.files.some(f => f.name === name) ?? false);
      function send(command, feature = slug) {
        const text = `/${command}${feature ? ` ${feature}` : ''}`;
        try { props.inputActions.setDraft(text); props.inputActions.submit(); setError(''); }
        catch (e) { setError(e.message); }
      }
      async function open(rel) {
        try { setFile(await api({ action: 'file', session: props.sessionId, path: rel })); }
        catch (e) { setError(e.message); }
      }
      const ready = name => name === 'constitution' ? Boolean(state?.constitution)
        : name === 'specify' ? Boolean(specName)
        : name === 'clarify' ? Boolean(active?.clarify)
        : has(name);
      return h('section', { className: 'sk-page' }, h('style', null, css),
        h('div', { className: 'sk-row sk-between' }, h('h1', { className: 'sk-title' }, 'Spec Kit'), h('button', { className: 'sk-button', type: 'button', onClick: () => setTick(x => x + 1) }, 'Refresh')),
        state ? h('p', { className: 'sk-muted' }, `${state.workspace}${state.branch ? ` · ${state.branch}` : ''}`) : h('p', { className: 'sk-muted' }, 'Loading…'),
        error ? h('p', { className: 'sk-error', role: 'alert' }, error) : null,
        h('div', { className: 'sk-row', style: { marginTop: 10 } },
          h('select', { className: 'sk-input', value: slug, onChange: e => { setSlug(e.target.value); setFile(null); }, 'aria-label': 'Feature' },
            ...(state?.features ?? []).map(f => h('option', { key: f.slug, value: f.slug }, f.title || f.slug))),
          h('button', { className: 'sk-button sk-primary', type: 'button', disabled: !active, onClick: () => send('speckit-plan') }, 'Plan'),
          h('button', { className: 'sk-button', type: 'button', disabled: !slug, onClick: () => send('speckit-implement') }, 'Implement')),
        !state ? null : !state.features.length ? h('div', { className: 'sk-card' },
          state.constitution
            ? h(React.Fragment, null,
              h('p', { className: 'sk-muted' }, `Constitution: ${state.constitution.path}`),
              h('div', { className: 'sk-row', style: { marginTop: 6 } },
                h('button', { className: 'sk-button', type: 'button', onClick: () => open(state.constitution.path) }, 'View'),
                h('button', { className: 'sk-button', type: 'button', onClick: () => send('speckit-constitution') }, 'Update constitution')))
            : h(React.Fragment, null,
              h('p', { className: 'sk-muted' }, 'No Spec Kit constitution or feature found in this workspace.'),
              h('button', { className: 'sk-button sk-primary', type: 'button', onClick: () => send('speckit-constitution') }, 'Create constitution')),
          h('p', { className: 'sk-muted', style: { marginTop: 10 } }, 'Start the first feature with a short lowercase slug:'),
          h('div', { className: 'sk-row' },
            h('input', { className: 'sk-input', value: newSlug, placeholder: 'feature-slug', 'aria-label': 'New feature slug',
              onChange: e => setNewSlug(e.target.value.replace(/[^a-z0-9-]/g, '')) }),
            h('button', { className: 'sk-button sk-primary', type: 'button', disabled: !newSlug,
              onClick: () => send('speckit-specify', newSlug) }, 'Specify feature'))) : h(React.Fragment, null,
          h('div', { className: 'sk-card' },
            h('div', { className: 'sk-row sk-between' }, h('strong', { style: { fontSize: 13 } }, 'Pipeline'), h('span', { className: 'sk-muted' }, active?.layout ?? '')),
            ...STAGES.map(([key, label, command]) => h('div', { className: 'sk-stage', key },
              h('span', { className: 'sk-dot', 'data-ready': ready(key) }),
              h('span', { className: 'sk-name' }, label),
              h('span', { className: 'sk-file' }, key === 'clarify' ? (active?.clarify ? 'clarified' : '—') : key === 'analyze' ? (active?.files.find(f => /^analy[sz]e/i.test(f.name))?.name ?? '—') : (active?.files.find(f => f.name === `${key}.md`)?.name ?? (key === 'constitution' ? (state.constitution?.path ?? '—') : '—'))),
              h('button', { className: 'sk-button', type: 'button', onClick: () => send(command) }, 'Run'))),
            active?.tasks.total ? h(React.Fragment, null,
              h('p', { className: 'sk-muted', style: { marginTop: 8 } }, `Tasks: ${active.tasks.done} / ${active.tasks.total}`),
              h('div', { className: 'sk-bar' }, h('span', { style: { width: `${Math.round(active.tasks.done / active.tasks.total * 100)}%` } }))) : null),
          h('div', { className: 'sk-card' },
            h('strong', { style: { fontSize: 13 } }, 'Documents'),
            ...(active?.files ?? []).map(f => h('div', { className: 'sk-row', key: f.path, style: { marginTop: 6 } },
              h('button', { className: 'sk-button', type: 'button', onClick: () => open(f.path) }, f.name),
              h('span', { className: 'sk-file' }, f.path))),
            file ? h(React.Fragment, null,
              h('div', { className: 'sk-row sk-between', style: { marginTop: 8 } }, h('strong', { style: { fontSize: 12 } }, file.path), h('button', { className: 'sk-button', type: 'button', onClick: () => setFile(null) }, 'Close')),
              h('pre', { className: 'sk-pre' }, file.text)) : null)));
    }
    return {
      inject: ['slots', 'sidebarRightTabs'],
      apply(ctx) {
        const id = '@inhuman/dsh-speckit-panel/tab';
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id, kind: 'speckit-panel', keepMounted: true, title: () => 'Spec Kit',
          guide: [{ id: 'speckit-panel', order: 30, title: () => 'Spec Kit', description: () => 'Spec-driven pipeline and /speckit actions', icon: Icon }],
        }));
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab', key: id,
        }, Panel));
      },
    };
  },
});
