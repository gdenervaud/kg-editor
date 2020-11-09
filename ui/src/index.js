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

import React, { useEffect } from "react";
import { render } from "react-dom";
// import { configure } from "mobx";
import { observer } from "mobx-react";
import { Router, Route, Switch } from "react-router-dom";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createUseStyles } from "react-jss";

import "react-virtualized/styles.css";

import Cookies from "universal-cookie";

import "./Services/IconsImport";

import { useStores } from "./Hooks/UseStores";

import Tabs from "./Views/Tabs";

import NotFound from "./Views/NotFound";
import Home from "./Views/Home";
import Login from "./Views/Login";
import Help from "./Views/Help";
// import Statistics from "./Views/Statistics";
import Browse from "./Views/Browse";
import Instance from "./Views/Instance";
import FetchingLoader from "./Components/FetchingLoader";
import GlobalError from "./Views/GlobalError";
import * as Sentry from "@sentry/browser";
import "bootstrap/dist/css/bootstrap.min.css";

import "@babel/polyfill";

import WorkspaceModal from "./Views/WorkspaceModal";

// configure({
//   enforceActions: "always",
//   computedRequiresReaction: true,
//   reactionRequiresObservable: true,
//   observableRequiresReaction: false,
//   disableErrorBoundaries: false // help to debug only
// });

const useStyles = createUseStyles({
  "@global html, body, #root": {
    height: "100%",
    overflow: "hidden",
    textRendering: "optimizeLegibility",
    "-webkit-font-smoothing": "antialiased",
    "-webkit-tap-highlight-color": "transparent",
    fontFamily: "Lato, sans-serif",
    fontSize: "14px"
  },
  "@global *": {
    boxSizing: "border-box"
  },
  "@global button, @global input[type=button], @global a": {
    "-webkit-touch-callout": "none",
    userSelect: "none"
  },
  layout: {
    height: "100vh",
    display: "grid",
    overflow: "hidden",
    gridTemplateColumns: "1fr",
    gridTemplateRows: "auto 1fr 20px"
  },
  body: {
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(var(--bg-gradient-angle), var(--bg-gradient-start), var(--bg-gradient-end))",
    backgroundSize: "200%"
  },
  status: {
    background: "var(--bg-color-ui-contrast1)",
    color: "var(--ft-color-loud)",
    paddingLeft: "10px"
  },
  deleteInstanceErrorModal: {
    "& .modal-dialog": {
      top: "35%",
      width: "max-content",
      maxWidth: "800px",
      "& .modal-body": {
        padding: "15px 25px",
        border: "1px solid var(--ft-color-loud)",
        borderRadius: "4px",
        color: "var(--ft-color-loud)",
        background: "var(--list-bg-hover)"
      }
    }
  },
  deleteInstanceError: {
    margin: "20px 0",
    color: "var(--ft-color-error)"
  },
  deleteInstanceErrorFooterBar: {
    marginBottom: "10px",
    width: "100%",
    textAlign: "center",
    wordBreak: "keep-all",
    whiteSpace: "nowrap",
    "& button + button": {
      marginLeft: "20px"
    }
  },
  deletingInstanceModal: {
    position: "absolute",
    top: "40%",
    right: "35%",
    "& .modal-dialog": {
      top: "35%",
      width: "max-content",
      maxWidth: "800px",
      "& .modal-body": {
        padding: "30px",
        border: "1px solid var(--ft-color-loud)",
        borderRadius: "4px",
        color: "var(--ft-color-loud)",
        background: "var(--list-bg-hover)",
        "& .fetchingPanel": {
          position: "unset !important",
          top: "unset",
          left: "unset",
          width: "unset",
          transform: "none",
          wordBreak: "break-word",
          "& .fetchingLabel": {
            display: "inline"
          }
        }
      }
    }
  },
  noAccessModal: {
    maxWidth: "min(max(500px, 50%),750px)",
    "&.modal-dialog": {
      marginTop: "40vh",
      "& .modal-body": {
        padding: "15px 30px",
        fontSize: "1.6rem"
      }
    }
  }
});

const AppComponent = observer(() => {

  const { appStore, authStore, history } = useStores();

  const classes = useStyles();

  const Theme = appStore.availableThemes[appStore.currentTheme];

  const handleRetryDeleteInstance = () => appStore.retryDeleteInstance();

  const handleCancelDeleteInstance = () => appStore.cancelDeleteInstance();
  return (
    <Router history={history}>
      <div className={classes.layout}>
        <Theme />
        <Tabs />
        <div className={classes.body}>
          {appStore.globalError ?
            <Route component={GlobalError} />
            :
            !appStore.isInitialized || !authStore.isAuthenticated ?
              <Route component={Login} />
              :
              authStore.isUserAuthorized?
                authStore.hasWorkspaces?
                  appStore.currentWorkspace?
                    <Switch>
                      <Route path="/instances/:id" exact={true} render={props=><Instance {...props} mode="view" />} />
                      <Route path="/instances/:id/create" exact={true} render={props=><Instance {...props} mode="create" />} />
                      <Route path="/instances/:id/edit" exact={true} render={props=><Instance {...props} mode="edit" />} />
                      <Route path="/instances/:id/invite" exact={true} render={props=><Instance {...props} mode="invite" />} />
                      <Route path="/instances/:id/graph" exact={true} render={props=><Instance {...props} mode="graph" />} />
                      <Route path="/instances/:id/release" exact={true} render={props=><Instance {...props} mode="release" />} />
                      <Route path="/instances/:id/manage" exact={true}  render={props=><Instance {...props} mode="manage" />} />

                      <Route path="/browse" exact={true} component={Browse} />
                      <Route path="/help" component={Help} />
                      {/* <Route path="/kg-stats" exact={true} component={Statistics} /> */}
                      <Route path="/" exact={true} component={Home} />
                      <Route component={NotFound} />
                    </Switch>
                    :
                    <Route component={WorkspaceModal} />
                  :
                  <Modal dialogClassName={classes.noAccessModal} show={true} onHide={() => {}}>
                    <Modal.Body>
                      <h1>Welcome <span title={name}>{name}</span></h1>
                      <p>You are currently not granted permission to acccess any workspaces.</p>
                      <p>Please contact our team by email at : <a href={"mailto:kg@ebrains.eu"}>kg@ebrains.eu</a></p>
                    </Modal.Body>
                  </Modal>
                :
                <Modal dialogClassName={classes.noAccessModal} show={true} onHide={() => {}}>
                  <Modal.Body>
                    <h1>Welcome</h1>
                    <p>You are currently not granted permission to acccess the application.</p>
                    <p>Please contact our team by email at : <a href={"mailto:kg@ebrains.eu"}>kg@ebrains.eu</a></p>
                  </Modal.Body>
                </Modal>
          }
        </div>
        {authStore.isAuthenticated && authStore.isUserAuthorized && (
          <React.Fragment>
            {appStore.deleteInstanceError ?
              <div className={classes.deleteInstanceErrorModal}>
                <Modal.Dialog>
                  <Modal.Body>
                    <div className={classes.deleteInstanceError}>{appStore.deleteInstanceError}</div>
                    <div className={classes.deleteInstanceErrorFooterBar}>
                      <Button onClick={handleCancelDeleteInstance}>Cancel</Button>
                      <Button variant="primary" onClick={handleRetryDeleteInstance}><FontAwesomeIcon icon="redo-alt" />&nbsp;Retry</Button>
                    </div>
                  </Modal.Body>
                </Modal.Dialog>
              </div>
              :
              appStore.isDeletingInstance && !!appStore.instanceToDelete ?
                <div className={classes.deletingInstanceModal}>
                  <Modal.Dialog>
                    <Modal.Body>
                      <FetchingLoader>{`Deleting instance "${appStore.instanceToDelete}" ...`}</FetchingLoader>
                    </Modal.Body>
                  </Modal.Dialog>
                </div>
                : null
            }
          </React.Fragment>
        )}
        <div className={`${classes.status} layout-status`}>
              Copyright &copy; {new Date().getFullYear()} EBRAINS. All rights reserved.
        </div>
      </div>
    </Router>
  );
});

class ErrorReport extends React.Component {

  componentDidMount() {
    const cookies = new Cookies();
    const sentryUrl = cookies.get("sentry_url");
    if (sentryUrl) {
      Sentry.init({
        dsn: sentryUrl
      });
    }
  }

  componentDidCatch(error, info) {
    const { stores } = this.props;
    const { appStore } = stores;
    appStore.setGlobalError(error, info);
  }

  render() {
    const { children } = this.props;
    return children;
  }
}

const App = ({ children }) => {

  const stores = useStores();
  const { appStore } = stores;

  useEffect(() => {
    appStore.initialize();
    document.addEventListener("keydown", appStore.handleGlobalShortcuts);
    return () => {
      document.removeEventListener("keydown", appStore.handleGlobalShortcuts);
    };
  }, [appStore]);

  return children(stores);
};

render(
  <React.StrictMode>
    <App>
      {stores => (
        <ErrorReport stores={stores}>
          <AppComponent />
        </ErrorReport>
      )}
    </App>
  </React.StrictMode>, document.getElementById("root"));
