import { createPreviewWorkbench } from '@clipbus/plugin-sdk/preview';
import { createApp } from 'vue';
import '../../shared/base.css';
import { attachmentScenarios } from '../scenarios/attachmentScenarios';
import { actionScenarios } from '../scenarios/actionScenarios';
import AttachmentApp from '../../features/preview-renderer/app.vue';
import ExpandedApp from '../../features/expanded-renderer/app.vue';
import DraftActionApp from '../../features/capability-gallery/draft-action-ui/app.vue';
import RendererFixedApp from '../../features/capability-gallery/renderer-fixed-ui/app.vue';
import RendererAutoApp from '../../features/capability-gallery/renderer-auto-ui/app.vue';
import RendererBoundedApp from '../../features/capability-gallery/renderer-bounded-ui/app.vue';

createPreviewWorkbench(document.getElementById('app')!, {
  scenarios: [...attachmentScenarios, ...actionScenarios],
  mount(slotEl, { scenario }) {
    const Comp =
      scenario.mode === 'action'
        ? DraftActionApp
        : scenario.view === 'expanded'
          ? ExpandedApp
          : scenario.view === 'gallery-fixed'
            ? RendererFixedApp
            : scenario.view === 'gallery-auto'
              ? RendererAutoApp
              : scenario.view === 'gallery-bounded'
                ? RendererBoundedApp
                : AttachmentApp;
    const app = createApp(Comp);
    app.mount(slotEl);
    return () => app.unmount();
  },
});
