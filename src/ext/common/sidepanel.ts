import { SIDEPANEL_TAB_ID } from "@/common/ipc/ipc_bg_cs";
import { getState } from "./global_state";
import { getPanelTabIpc } from "./tab";

export const checkIfSidePanelOpen = () => {
  return getPanelTabIpc()
    .then((panelIpc) => {
      let isActivePromise = panelIpc.ask("IS_ACTIVE");
      // Timeout promise to reject if the panel doesn't respond in 1.5 seconds
      let timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          // console.error("Error:>> Panel did not respond in time. It is considered to be closed.");
          reject(false);
        }, 1500);
      });
      let racePromise = Promise.race([isActivePromise, timeoutPromise]);
      return racePromise;
    })
    .then((isPanelActive) => {
      console.log("isPanel tab Active:>>", isPanelActive);
      return getState().then((state: any) => [isPanelActive, state]);
    })
    .then(([isPanelActive, state]) => {
      const isSidePanelOpen =
        isPanelActive && state.tabIds.panel === SIDEPANEL_TAB_ID;
      return isSidePanelOpen;
    })
    .catch((err) => {
      console.error("Error in checkIfSidePanelOpen:>>", err);
      return false;
    });
};
