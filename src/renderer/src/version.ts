/* eslint-disable no-console */
export let appVersion = null;
export const releaseName = 'Foldex';

export const appName = 'Cyberiada IDE';
export const seriousMode = true;
export const noTextMode = true;
export const noSchemeScreen = true;
export const showDevInfo = true;

export const telegramLink = 'https://t.me/PolyusNT_Insitulab';
export const sourceLink = 'https://github.com/kruzhok-team/lapki-client';

export function initAppVersion() {
  askAppVersion().then(() => {
    if (seriousMode) {
      console.log('👋 ' + appName + ' v' + appVersion);
    } else {
      console.log('😸 ' + appName + ' v' + appVersion + ' «' + releaseName + '»');
    }
  });
}

export async function askAppVersion() {
  const version = await window.electron.ipcRenderer.invoke('appVersion');
  appVersion = version;
}
