/*
 * Copyright 2018 - 2021 Swiss Federal Institute of Technology Lausanne (EPFL)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This open source software code was developed in part or in whole in the
 * Human Brain Project, funded from the European Union's Horizon 2020
 * Framework Programme for Research and Innovation under
 * Specific Grant Agreements No. 720270, No. 785907, and No. 945539
 * (Human Brain Project SGA1, SGA2 and SGA3).
 *
 */

import { observable, computed, action, runInAction, makeObservable, toJS } from "mobx";
import API from "../Services/API";

const rootPath = window.rootPath || "";

export class AuthStore {
  isUserAuthorized = false;
  isUserAuthorizationInitialized = false;
  user = null;
  isRetrievingUserProfile = false;
  userProfileError = null;
  authError = null;
  authSuccess = false;
  isTokenExpired = false;
  isInitializing = false;
  initializationError = null;
  isLogout = false;
  keycloak = null;
  endpoint = null;
  commit = null;

  transportLayer = null;

  constructor(transportLayer) {
    makeObservable(this, {
      isUserAuthorized: observable,
      isUserAuthorizationInitialized: observable,
      user: observable,
      commit: observable,
      isRetrievingUserProfile: observable,
      userProfileError: observable,
      authError: observable,
      authSuccess: observable,
      isTokenExpired: observable,
      isInitializing: observable,
      initializationError: observable,
      isLogout: observable,
      accessToken: computed,
      isAuthenticated: computed,
      hasUserProfile: computed,
      hasSpaces: computed,
      spaces: computed,
      logout: action,
      retrieveUserProfile: action,
      initializeKeycloak: action,
      login: action,
      authenticate: action,
      firstName: computed
    });

    this.transportLayer = transportLayer;
  }

  filteredList(term) {
    term = term && term.trim().toLowerCase();
    if(term) {
      return this.spaces.filter(t => t.id.toLowerCase().includes(term));
    }
    return this.spaces;
  }


  get accessToken() {
    return this.isAuthenticated ? this.keycloak.token: "";
  }

  get isAuthenticated() {
    return this.authSuccess;
  }

  get hasUserProfile() {
    return !!this.user;
  }

  get hasSpaces() {
    return this.user && this.user.spaces instanceof Array && !!this.user.spaces.length;
  }

  get spaces() {
    return this.hasSpaces ? this.user.spaces: [];
  }

  hasSpace(id) {
    return !!this.spaces.find(s => s.id === id);
  }

  getSpaceInfo(id) {
    const space = this.spaces.find(us => us.id === id);
    if (space) {
      return toJS(space);
    }
    return {id: id, name: id, permissions: {}};
  }

  get firstName() {
    const firstNameReg = /^([^ ]+) .*$/;
    if (this.hasUserProfile && this.user) {
      if (this.user.givenName) {
        return this.user.givenName;
      }
      if (this.user.name) {
        if (firstNameReg.test(this.user.name)) {
          return this.user.name.match(firstNameReg)[1];
        }
        return this.user.name;
      }
      if (this.user.username) {
        return this.user.username;
      }
    }
    return "";
  }

  logout() {
    this.authSuccess = false;
    this.isTokenExpired = true;
    this.isUserAuthorized = false;
    this.user = null;
    this.isUserAuthorizationInitialized = false;
    this.keycloak.logout({redirectUri: `${window.location.protocol}//${window.location.host}${rootPath}/logout`});
    this.isLogout = true;
  }

  async retrieveUserProfile() {
    if (this.isAuthenticated && !this.isRetrievingUserProfile && !this.user) {
      this.userProfileError = null;
      this.isRetrievingUserProfile = true;
      this.isUserAuthorizationInitialized = true;
      try {
        const { data } = await this.transportLayer.getUserProfile();
        runInAction(() => {
          this.isUserAuthorized = true;
          const user = (data && data.data)?data.data:{ spaces: []};
          user.spaces = Array.isArray(user.spaces)?user.spaces.sort((a, b) => a.name.localeCompare(b.name)):[];
          this.user = user;
          this.isRetrievingUserProfile = false;
        });
      } catch (e) {
        runInAction(() => {
          if (e.response && e.response.status === 403) {
            this.isUserAuthorized = false;
            this.isRetrievingUserProfile = false;
            this.isUserAuthorizationInitialized = false;
          } else {
            this.isUserAuthorized = false;
            this.userProfileError = e.message ? e.message : e;
            this.isRetrievingUserProfile = false;
            this.isUserAuthorizationInitialized = false;
          }
        });
      }
    }
  }

  login() {
    if(!this.isAuthenticated && this.keycloak) {
      this.keycloak.login();
    }
  }

  initializeKeycloak(keycloakSettings) {
    const keycloak = window.Keycloak(keycloakSettings);
    runInAction(() => this.keycloak = keycloak);
    keycloak.onAuthSuccess = () => {
      runInAction(() => {
        this.authSuccess = true;
        this.isInitializing = false;
      });
    };
    keycloak.onAuthError = error => {
      const message = (error && error.error_description)?error.error_description:"Failed to authenticate";
      runInAction(() => {
        this.authError = message;
      });
    };
    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(30)
        .catch(() => runInAction(() => {
          this.authSuccess = false;
          this.isTokenExpired = true;
        }));
    };
    keycloak.init({ onLoad: "login-required", pkceMethod: "S256" }).catch(() => {
      runInAction(() => {
        this.isInitializing = false;
        this.authError = "Failed to initialize authentication";
      });
    });
  }

  async authenticate() {
    if (this.isInitializing || this.authSuccess) {
      return;
    }
    this.isLogout = false;
    this.isInitializing = true;
    this.authError = null;
    try {
      const { data } = await this.transportLayer.getSettings();
      const commit = data?.data.commit;
      const keycloakSettings =  data?.data?.keycloak;
      API.setSentry(data?.data?.sentryUrl);
      API.setMatomo(data?.data?.matomo);
      runInAction(() => {
        this.commit = commit;
      });
      if(keycloakSettings) {
        const keycloakScript = document.createElement("script");
        keycloakScript.src = `${keycloakSettings.url}/js/keycloak.js`;
        keycloakScript.async = true;

        document.head.appendChild(keycloakScript);
        keycloakScript.onload = () => {
          this.initializeKeycloak(keycloakSettings);
        };
        keycloakScript.onerror = () => {
          document.head.removeChild(keycloakScript);
          runInAction(() => {
            this.isInitializing = false;
            this.authError = `Failed to load resource! (${keycloakScript.src})`;
          });
        };
      } else {
        runInAction(() => {
          this.isInitializing = false;
          this.authError = "The service is temporary unavailable. Please retry in a moment. (failed to load keycloak settings)";
        });
      }
    } catch (e) {
      runInAction(() => {
        this.isInitializing = false;
        this.authError = `The service is temporary unavailable. Please retry in a moment. (${e.message?e.message:e})`;
      });
    }
  }

  // async saveProfilePicture(picture) {
  //   try {
  //     await this.transportLayer.updateUserPicture(picture);
  //     runInAction(() => {
  //       this.user.picture = picture;
  //     });
  //   } catch (e) {
  //     // Catch Error
  //   }
  // }

}

export default AuthStore;