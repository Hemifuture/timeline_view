import { equivalentPaths, type EventPath } from "@/Timeline/paths";
import { defineStore } from "pinia";
import { computed, ref, watchEffect, onMounted } from "vue";
import {
  useLpc,
  type AppState,
  type MarkwhenState,
  type Sourced,
} from "./useLpc";
import type {
  DateFormat,
  DateRangeIso,
  DateTimeGranularity,
} from "@markwhen/parser";
import type { DisplayScale } from "@/Timeline/utilities/dateTimeUtilities";
import { parse } from "@markwhen/parser";
import { useColors } from "./useColors";
import type { EventGroup } from "@markwhen/parser";

export const useMarkwhenStore = defineStore("markwhen", () => {
  const app = ref<AppState>({ colorMap: { default: {} } });
  const markwhen = ref<MarkwhenState>();
  const showEditButton = ref(false);
  const showCopyLinkButton = ref(true);
  const onJumpToPath = ref((path: EventPath) => {});
  const onJumpToRange = ref((range: DateRangeIso) => {});
  const onGetSvg = ref((params: any): any => {});

  const hadInitialState = ref<boolean>(
    // @ts-ignore
    typeof window !== "undefined" && window.__markwhen_initial_state
  );

  const hash = computed(() => {
    if (markwhen.value?.rawText) {
      try {
        return btoa(markwhen.value?.rawText);
      } catch (e) {
        return "";
      }
    }
    return "";
  });

  const timelineLink = computed(
    () => `https://timeline.markwhen.com#mw=${hash.value}`
  );
  const editorLink = computed(
    () => `https://meridiem.markwhen.com#mw=${hash.value}`
  );
  const embedLink = computed(() => `<iframe src="${timelineLink.value}" />`);

  onMounted(async () => {
    try {
      // 根据当前环境决定加载哪个文件，DEV 加载 test.mw，PROD 加载 all.mw
      // const url =
      //   import.meta.env.MODE === "development"
      //     ? "/data/test.mw"
      //     : "/data/all.mw";
      const url = "/data/all.mw";
      const resp = await fetch(url).catch(() => {});
      if (resp && resp.ok) {
        const text = await resp.text();
        const mw = parse(text);
        app.value = {
          isDark: false,
          colorMap: useColors(mw).value,
        };
        markwhen.value = {
          rawText: text,
          parsed: mw,
          transformed: mw.events as Sourced<EventGroup>,
        };
        showEditButton.value = true;
        showCopyLinkButton.value = false;
      }
    } catch {}
  });

  const { postRequest } = useLpc({
    appState(s) {
      showEditButton.value = false;
      showCopyLinkButton.value = true;
      app.value = s;
    },
    markwhenState: (s) => {
      markwhen.value = s;
    },
    jumpToPath: ({ path }) => {
      onJumpToPath.value?.(path);
    },
    jumpToRange: ({ dateRangeIso }) => {
      onJumpToRange.value?.(dateRangeIso);
    },
    getSvg: (params: any) => onGetSvg.value?.(params),
  });

  const setHoveringPath = (path?: EventPath) => {
    postRequest("setHoveringPath", path);
  };

  const setDetailEventPath = (path?: EventPath) => {
    postRequest("setDetailPath", path);
  };

  const setText = (text: string, at?: { from: number; to: number }) => {
    postRequest("setText", { text, at });
  };

  const showInEditor = (path: EventPath) => {
    postRequest("showInEditor", path);
  };

  const isDetailEventPath = (path: EventPath | undefined) =>
    !!path && equivalentPaths(path, app.value?.detailPath);

  const createEventFromRange = (
    dateRangeIso: DateRangeIso,
    granularity: DateTimeGranularity,
    immediate: boolean = true
  ) => {
    postRequest("newEvent", { dateRangeIso, granularity, immediate });
  };

  const editEventDateRange = (
    path: EventPath,
    dateRangeIso: DateRangeIso,
    scale: DisplayScale,
    preferredInterpolationFormat?: DateFormat
  ) => {
    const params = {
      path,
      range: dateRangeIso,
      scale,
      preferredInterpolationFormat,
    };
    postRequest("editEventDateRange", params);
  };

  const requestStateUpdate = () => {
    postRequest("markwhenState");
    postRequest("appState");
  };
  requestStateUpdate();

  return {
    app,
    markwhen,
    hadInitialState,

    onJumpToPath,
    onJumpToRange,
    onGetSvg,

    requestStateUpdate,
    setHoveringPath,
    setDetailEventPath,
    isDetailEventPath,
    setText,
    showInEditor,
    createEventFromRange,
    editEventDateRange,

    showEditButton,
    showCopyLinkButton,
    showEmbedButton: showCopyLinkButton,

    timelineLink,
    editorLink,
    embedLink,
  };
});
