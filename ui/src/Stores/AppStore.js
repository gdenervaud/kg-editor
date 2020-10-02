/*
*   Copyright (c) 2020, EPFL/Human Brain Project PCO
*
*   Licensed under the Apache License, Version 2.0 (the "License");
*   you may not use this file except in compliance with the License.
*   You may obtain a copy of the License at
*
*       http://www.apache.org/licenses/LICENSE-2.0
*
*   Unless required by applicable law or agreed to in writing, software
*   distributed under the License is distributed on an "AS IS" BASIS,
*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*   See the License for the specific language governing permissions and
*   limitations under the License.
*/

import {observable, computed, action, runInAction} from "mobx";
import * as Sentry from "@sentry/browser";
import { matchPath } from "react-router-dom";
import _  from "lodash-uuid";

import DefaultTheme from "../Themes/Default";
import BrightTheme from "../Themes/Bright";
import CupcakeTheme from "../Themes/Cupcake";
import authStore from "./AuthStore";
import instanceStore from "./InstanceStore";
import routerStore from "./RouterStore";
import API from "../Services/API";
import historyStore from "./HistoryStore";
import viewStore from "./ViewStore";
import typesStore from "./TypesStore";
import browseStore from "./BrowseStore";
import statusStore from "./StatusStore";

const kCode = { step: 0, ref: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65] };

const getLinkedInstanceIds = instanceIds => {
  const result = instanceIds.reduce((acc, id) => {
    const instance = instanceStore.instances.get(id);
    if (instance) {
      const linkedIds = instance.linkedIds;
      acc.push(...linkedIds);
    }
    return acc;
  }, []);
  return Array.from(new Set(result));
};

class AppStore{
  @observable globalError = null;
  @observable initializingMessage = null;
  @observable initializationError = null;
  @observable initialInstanceError = null;
  @observable initialInstanceWorkspaceError = null;
  @observable isInitialized = false;
  @observable canLogin = true;
  @observable currentTheme;
  @observable historySettings;
  @observable currentWorkspace = null;
  @observable showSaveBar = false;
  @observable instanceToDelete = null;
  @observable isDeletingInstance = false;
  @observable deleteInstanceError = null;
  @observable isCreatingNewInstance = false;
  @observable instanceCreationError = null;
  @observable pathsToResolve = new Map();
  @observable comparedInstanceId = null;
  @observable comparedWithReleasedVersionInstance = null;

  availableThemes = {
    "default": DefaultTheme,
    "bright": BrightTheme,
    "cupcake": CupcakeTheme
  }

  constructor(){
    this.canLogin = !matchPath(routerStore.history.location.pathname, { path: "/logout", exact: "true" });
    let savedTheme = localStorage.getItem("currentTheme");
    this.currentTheme = savedTheme === "bright"? "bright": "default";
    let savedHistorySettings = null;
    if (localStorage.getItem("historySettings")) {
      try {
        savedHistorySettings = JSON.parse(localStorage.getItem("historySettings"));
      } catch (e) {
        savedHistorySettings = null;
      }
    }
    if (!savedHistorySettings) {
      savedHistorySettings = {
        size: 10,
        eventTypes: {
          viewed: false,
          edited: true,
          bookmarked: true,
          released: false
        }
      };
    }
    this.historySettings = savedHistorySettings;
  }

  @computed
  get currentWorkspaceName() {
    if (this.currentWorkspace) {
      return this.currentWorkspace.name || this.currentWorkspace.id;
    }
    return "";
  }

  @computed
  get currentWorkspacePermissions() {
    return this.currentWorkspace?this.currentWorkspace.permissions:{};
  }

  @action
  async initialize() {
    if (this.canLogin && !this.isInitialized) {
      this.initializingMessage = "Initializing the application...";
      this.initializationError = null;
      this.initialInstanceError = null;
      this.initialInstanceWorkspaceError = null;
      if(!authStore.isAuthenticated) {
        this.initializingMessage = "User authenticating...";
        await authStore.authenticate();
        if (authStore.authError) {
          runInAction(() => {
            this.initializationError = authStore.authError;
            this.initializingMessage = null;
          });
        }
      }
      if(authStore.isAuthenticated && !authStore.hasUserProfile) {
        runInAction(() => {
          this.initializingMessage = "Retrieving user profile...";
        });
        await authStore.retrieveUserProfile();
        if (authStore.userProfileError) {
          runInAction(() => {
            this.initializationError = authStore.userProfileError;
            this.initializingMessage = null;
          });
        }
      }
      if(authStore.isFullyAuthenticated) {
        await this.initializeWorkspace();
        runInAction(() => {
          this.initializingMessage = null;
          this.isInitialized = !!this.currentWorkspace || (!this.initialInstanceError && !this.initialInstanceWorkspaceError) ;
        });
      }
    }
  }

  @action
  flush(){
    instanceStore.flush();
    statusStore.flush();
    this.showSaveBar = false;
    this.isCreatingNewInstance = false;
    this.instanceCreationError = null;
    this.instanceToDelete = null;
    this.isDeletingInstance = false;
    this.deleteInstanceError = null;
    this.pathsToResolve.clear();
  }

  @action
  async initializeWorkspace() {
    let workspace = null;
    this.initializingMessage = "Setting workspace...";
    const path = matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" });
    if (path && path.params.mode !== "create") {
      workspace = await this.getInitialInstanceWorkspace(path.params.id);
      if (workspace) {
        this.setCurrentWorkspace(workspace);
        if (!this.currentWorkspace || this.currentWorkspace.id !== workspace) {
          this.initialInstanceWorkspaceError = `Could not load instance "${path.params.id}" because you're not granted access to workspace "${workspace}".`;
        }
      }
      return this.currentWorkspace;
    } else {
      workspace = localStorage.getItem("currentWorkspace");
      this.setCurrentWorkspace(workspace);
      return this.currentWorkspace;
    }
  }

  @action
  async getInitialInstanceWorkspace(instanceId){
    this.initializingMessage = `Retrieving instance "${instanceId}"...`;
    try{
      const response = await API.axios.get(API.endpoints.instance(instanceId));
      const data = response.data && response.data.data;
      if(data){

        const instance = instanceStore.createInstanceOrGet(instanceId);
        instance.initializeData(data);

        if(data.workspace){
          return data.workspace;
        }
        runInAction(() => {
          this.initialInstanceError = `Instance "${instanceId}" does not have a workspace.`;
          this.initializingMessage = null;
        });
        return null;
      } else {
        runInAction(() => {
          this.initialInstanceError = `Instance "${instanceId}" can not be found - it either could have been removed or it is not accessible by your user account.`;
          this.initializingMessage = null;
        });
        return null;
      }
    } catch(e){
      runInAction(() => {
        const message = e.message?e.message:e;
        const errorMessage = e.response && e.response.status !== 500 ? e.response.data:"";
        if(e.response && e.response.status === 404){
          this.initialInstanceError = `Instance "${instanceId}" can not be found - it either could have been removed or it is not accessible by your user account.`;
        }
        else {
          this.initialInstanceError = `Error while retrieving instance "${instanceId}" (${message}) ${errorMessage}`;
        }
        this.initializingMessage = null;
      });
    }
    return null;
  }

  @action
  cancelInitialInstance() {
    routerStore.history.replace("/browse");
    this.initializationError = null;
    this.initialInstanceError = null;
    this.initialInstanceWorkspaceError = null;
    this.initializingMessage = null;
    const workspace = localStorage.getItem("currentWorkspace");
    this.setCurrentWorkspace(workspace);
    this.isInitialized = true;
  }

  closeAllInstances() {
    instanceStore.resetInstanceIdAvailability();
    if (!(matchPath(routerStore.history.location.pathname, { path: "/", exact: "true" })
      || matchPath(routerStore.history.location.pathname, { path: "/browse", exact: "true" })
      || matchPath(routerStore.history.location.pathname, { path: "/help/*", exact: "true" }))) {
      routerStore.history.push("/browse");
    }
    viewStore.unregisterAllViews();
  }

  clearViews() {
    instanceStore.resetInstanceIdAvailability();
    if (!(matchPath(routerStore.history.location.pathname, { path: "/", exact: "true" })
      || matchPath(routerStore.history.location.pathname, { path: "/browse", exact: "true" })
      || matchPath(routerStore.history.location.pathname, { path: "/help/*", exact: "true" }))) {
      routerStore.history.push("/browse");
    }
    viewStore.clearViews();
  }

  @action
  setGlobalError(error, info){
    this.globalError = {error, info};
  }

  @action
  dismissGlobalError(){
    this.globalError = null;
  }

  captureSentryException = e => {
    const { response } = e;
    const { status } = response;
    switch(status) {
    case 500:
    {
      Sentry.captureException(e);
      break;
    }
    }
  }

  setTheme(theme){
    this.currentTheme = this.availableThemes[theme]? theme: "default";
    localStorage.setItem("currentTheme", this.currentTheme);
  }

  toggleTheme(){
    if(this.currentTheme === "bright"){
      this.setTheme("default");
    } else {
      this.setTheme("bright");
    }
  }

  setSizeHistorySetting(size){
    size = Number(size);
    this.historySettings.size = (!isNaN(size) && size > 0)?size:10;
    localStorage.setItem("historySettings", JSON.stringify(this.historySettings));
  }

  toggleViewedFlagHistorySetting(on){
    this.historySettings.eventTypes.viewed = on?true:false;
    localStorage.setItem("historySettings", JSON.stringify(this.historySettings));
  }

  toggleEditedFlagHistorySetting(on){
    this.historySettings.eventTypes.edited = on?true:false;
    localStorage.setItem("historySettings", JSON.stringify(this.historySettings));
  }

  toggleBookmarkedFlagHistorySetting(on){
    this.historySettings.eventTypes.bookmarked = on?true:false;
    localStorage.setItem("historySettings", JSON.stringify(this.historySettings));
  }

  toggleReleasedFlagHistorySetting(on){
    this.historySettings.eventTypes.released = on?true:false;
    localStorage.setItem("historySettings", JSON.stringify(this.historySettings));
  }

  @action
  setCurrentWorkspace = space => {
    let workspace = space?authStore.workspaces.find( w => w.id === space):null;
    if (!workspace && authStore.hasWorkspaces && authStore.workspaces.length === 1) {
      workspace = authStore.workspaces[0];
    }
    if(this.currentWorkspace !== workspace) {
      if(viewStore.views.size > 0) {
        if (window.confirm("You are about to change workspace. All opened instances will be closed. Continue ?")) {
          this.clearViews();
        } else {
          return;
        }
      }
      this.currentWorkspace = workspace;
      if (this.currentWorkspace) {
        localStorage.setItem("currentWorkspace", workspace.id);
        viewStore.restoreViews();
        typesStore.fetch(true);
        browseStore.clearInstances();
      } else {
        localStorage.removeItem("currentWorkspace");
      }
    }
  }

  @action
  toggleSavebarDisplay(state){
    this.showSaveBar = state !== undefined? !!state: !this.showSaveBar;
  }


  createInstance = () => {
    const uuid = _.uuid();
    routerStore.history.push(`/instance/create/${uuid}`);
  }

  @action
  openInstance(instanceId, instanceName, instancePrimaryType, viewMode = "view"){
    viewStore.registerViewByInstanceId(instanceId, instanceName, instancePrimaryType, viewMode);
    if(viewMode !== "create") {
      historyStore.updateInstanceHistory(instanceId, "viewed");
    }
    viewStore.syncStoredViews();
  }

  getReadMode() {
    const path = matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" });
    return !(path && (path.params.mode === "edit" || path.params.mode === "create"));
  }

  @action
  closeInstance(instanceId) {
    if (matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" })) {
      if (matchPath(routerStore.history.location.pathname, { path: `/instance/:mode/${instanceId}`, exact: "true" })) {
        if (viewStore.views.size > 1) {
          const openedInstances = viewStore.instancesIds;
          const currentInstanceIndex = openedInstances.indexOf(instanceId);
          const newCurrentInstanceId = currentInstanceIndex >= openedInstances.length - 1 ? openedInstances[currentInstanceIndex - 1] : openedInstances[currentInstanceIndex + 1];

          const openedInstance = viewStore.views.get(newCurrentInstanceId);
          routerStore.history.push(`/instance/${openedInstance.mode}/${newCurrentInstanceId}`);
        } else {
          routerStore.history.push("/browse");
          browseStore.clearSelectedInstance();
        }
      }
    }
    instanceStore.instanceIdAvailability.delete(instanceId);
    viewStore.unregisterViewByInstanceId(instanceId);
    const instance = instanceStore.instances.get(instanceId);
    if (instance) {
      const instanceIdsToBeKept = getLinkedInstanceIds(viewStore.instancesIds);
      const instanceIdsToBeRemoved = instance.linkedIds.filter(id => !instanceIdsToBeKept.includes(id));
      instanceStore.removeInstances(instanceIdsToBeRemoved);
    }
  }

  @action
  async saveInstance(instance) {
    const isNew = instance.isNew;
    const id = instance.id;
    await instance.save();
    const newId = instance.id;
    if (!instance.hasSaveError) {
      if (isNew) {
        runInAction(() => {
          const view = viewStore.views.get(id);
          if (newId !== id) {
            viewStore.replaceViewByNewInstanceId(id, newId);
            this.pathsToResolve.set(`/instance/create/${id}`, `/instance/edit/${newId}`);
          } else {
            view.mode = "edit";
            this.pathsToResolve.set(`/instance/create/${id}`, `/instance/edit/${id}`);
          }
        });
        viewStore.syncStoredViews();
      }
    }
    historyStore.updateInstanceHistory(instance.id, "edited");
    statusStore.flush();
  }

  syncInstancesHistory(instance, mode) {
    if(instance && viewStore.views.has(instance.id)){
      historyStore.updateInstanceHistory(instance.id, mode);
    }
  }

  @action
  async deleteInstance(instanceId){
    if (instanceId) {
      this.instanceToDelete = instanceId;
      this.isDeletingInstance = true;
      this.deleteInstanceError = null;
      try{
        await API.axios.delete(API.endpoints.instance(instanceId));
        runInAction(() => {
          this.instanceToDelete = null;
          this.isDeletingInstance = false;
          let nextLocation = null;
          if(matchPath(routerStore.history.location.pathname, {path:"/instance/:mode/:id*", exact:"true"})){
            if(matchPath(routerStore.history.location.pathname, {path:`/instance/:mode/${instanceId}`, exact:"true"})){
              const openedInstances = viewStore.instancesIds;
              if(openedInstances.length > 1){
                const currentInstanceIndex = openedInstances.indexOf(instanceId);
                const newInstanceId = currentInstanceIndex >= openedInstances.length - 1 ? openedInstances[currentInstanceIndex-1]: openedInstances[currentInstanceIndex+1];
                const openedInstance = openedInstances.get(newInstanceId);
                nextLocation = `/instance/${openedInstance.mode}/${newInstanceId}`;
              } else {
                nextLocation = "/browse";
              }
            }
          }
          browseStore.refreshFilter();
          viewStore.unregisterViewByInstanceId(instanceId);
          this.flush();
          if (nextLocation) {
            routerStore.history.push(nextLocation);
          }
        });
      } catch(e){
        runInAction(() => {
          const message = e.message?e.message:e;
          const errorMessage = e.response && e.response.status !== 500 ? e.response.data:"";
          this.deleteInstanceError = `Failed to delete instance "${instanceId}" (${message}) ${errorMessage}`;
          this.isDeletingInstance = false;
        });
      }
    }
  }

  @action
  async duplicateInstance(fromInstanceId){
    let instanceToCopy = instanceStore.instances.get(fromInstanceId);
    let values = JSON.parse(JSON.stringify(instanceToCopy.initialValues));
    delete values.id;
    const labelField = instanceToCopy.labelField;
    if(labelField) {
      values[labelField] = (values[labelField]?(values[labelField] + " "):"") + "(Copy)";
    }
    this.isCreatingNewInstance = true;
    values["@type"] = instanceToCopy.types.map(t => t.name);
    try{
      const { data } = await API.axios.post(API.endpoints.createInstance(), values);
      runInAction(() => {
        this.isCreatingNewInstance = false;
      });
      const newId = data.data.id;
      const newInstance = instanceStore.createInstanceOrGet(newId);
      newInstance.initializeData(data.data, false, false);
      routerStore.history.push("/instance/edit/" + newId);
    } catch(e){
      runInAction(() => {
        this.isCreatingNewInstance = false;
        this.instanceCreationError = e.message;
      });
    }
  }

  @action
  async retryDeleteInstance() {
    return await this.deleteInstance(this.instanceToDelete);
  }

  @action
  cancelDeleteInstance() {
    this.instanceToDelete = null;
    this.deleteInstanceError = null;
  }

  replaceInstanceResolvedIdPath(path) {
    if (this.pathsToResolve.has(path)) {
      const newPath = this.pathsToResolve.get(path);
      this.pathsToResolve.delete(path);
      routerStore.history.replace(newPath);
      return true;
    }
    return false;
  }

  focusPreviousInstance(instanceId) {
    if (instanceId && matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" }) && matchPath(routerStore.history.location.pathname, { path: `/instance/:mode/${instanceId}`, exact: "true" })) {
      if (viewStore.views.size > 1) {
        let openedInstances = viewStore.instancesIds;
        let currentInstanceIndex = openedInstances.indexOf(instanceId);
        let newCurrentInstanceId = currentInstanceIndex === 0 ? openedInstances[openedInstances.length - 1] : openedInstances[currentInstanceIndex - 1];

        let openedInstance = viewStore.views.get(newCurrentInstanceId);
        routerStore.history.push(`/instance/${openedInstance.mode}/${newCurrentInstanceId}`);
      } else {
        routerStore.history.push("/browse");
      }
    } else {
      if (viewStore.views.size > 1) {
        const openedInstances = viewStore.instancesIds;
        const newCurrentInstanceId = openedInstances[openedInstances.length - 1];
        const openedInstance = viewStore.views.get(newCurrentInstanceId);
        routerStore.history.push(`/instance/${openedInstance.mode}/${newCurrentInstanceId}`);
      } else {
        routerStore.history.push("/browse");
      }
    }
  }

  focusNextInstance(instanceId) {
    if (instanceId && matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" }) && matchPath(routerStore.history.location.pathname, { path: `/instance/:mode/${instanceId}`, exact: "true" })) {
      if (viewStore.views.size > 1) {
        const openedInstances = viewStore.instancesIds;
        const currentInstanceIndex = openedInstances.indexOf(instanceId);
        const newCurrentInstanceId = currentInstanceIndex >= openedInstances.length - 1 ? openedInstances[0] : openedInstances[currentInstanceIndex + 1];

        const openedInstance = viewStore.views.get(newCurrentInstanceId);
        routerStore.history.push(`/instance/${openedInstance.mode}/${newCurrentInstanceId}`);
      } else {
        routerStore.history.push("/browse");
      }
    } else {
      if (viewStore.views.size > 1) {
        const openedInstances = viewStore.instancesIds;
        const newCurrentInstanceId = openedInstances[0];
        const openedInstance = viewStore.views.get(newCurrentInstanceId);
        routerStore.history.push(`/instance/${openedInstance.mode}/${newCurrentInstanceId}`);
      } else {
        routerStore.history.push("/browse");
      }
    }
  }

  @action
  setComparedInstance(instanceId){
    this.comparedInstanceId = instanceId;
  }

  @action
  setComparedWithReleasedVersionInstance(instance){
    this.comparedWithReleasedVersionInstance = instance;
  }

  goToDashboard = () => {
    routerStore.history.push("/");
  }

  @action
  login = () => {
    if (this.canLogin) {
      authStore.login();
    } else {
      routerStore.history.replace("/");
      this.canLogin = true;
      this.initialize(true);
    }
  }

  logout = () => {
    if (!instanceStore.hasUnsavedChanges || confirm("You have unsaved changes pending. Are you sure you want to logout?")) {
      viewStore.flushStoredViews();
      authStore.logout();
    }
  }

  handleGlobalShortcuts = e => {
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.keyCode === 84) {
      this.toggleTheme();
    } else if (e.altKey && e.keyCode === 66) { // alt+b, browse
      routerStore.history.push("/browse");
    } else if (e.altKey && e.keyCode === 78) { // alt+n, new
      this.createInstance();
    } else if (e.altKey && e.keyCode === 68) { // alt+d, dashboard
      routerStore.history.push("/");
    } else if (e.keyCode === 112) { // F1, help
      routerStore.history.push("/help");
    } else if (e.altKey && e.keyCode === 87) { // alt+w, close
      if (e.shiftKey) { // alt+shift+w, close all
        this.closeAllInstances();
      } else {
        let matchInstanceTab = matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" });
        if (matchInstanceTab) {
          this.handleCloseInstance(matchInstanceTab.params.id);
        }
      }
    } else if (e.altKey && e.keyCode === 37) { // left arrow, previous
      let matchInstanceTab = matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" });
      this.focusPreviousInstance(matchInstanceTab && matchInstanceTab.params.id);
    } else if (e.altKey && e.keyCode === 39) { // right arrow, next
      let matchInstanceTab = matchPath(routerStore.history.location.pathname, { path: "/instance/:mode/:id*", exact: "true" });
      this.focusNextInstance(matchInstanceTab && matchInstanceTab.params.id);
    } else {
      kCode.step = kCode.ref[kCode.step] === e.keyCode ? kCode.step + 1 : 0;
      if (kCode.step === kCode.ref.length) {
        kCode.step = 0;
        this.setTheme("cupcake");
      }
    }
  }
}



export default new AppStore();