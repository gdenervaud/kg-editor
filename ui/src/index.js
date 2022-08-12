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

import React from "react";
import { createRoot } from 'react-dom/client';
// import { configure } from "mobx"; //NOSONAR
import { JssProvider } from "react-jss";
import { BrowserRouter } from "react-router-dom";

import "react-virtualized/styles.css";
import "bootstrap/dist/css/bootstrap.min.css";

import "./Services/IconsImport";

import App from "./Views/App";
import ErrorBoundary from "./Views/ErrorBoundary";


/* //NOSONAR React debug flags
configure({
  enforceActions: "always",
  computedRequiresReaction: true,
  reactionRequiresObservable: true,
  observableRequiresReaction: false,
  disableErrorBoundaries: false // help to debug only
});
*/

//reportWebVitals(); //NOSONAR

const container = document.getElementById('root');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
root.render(
  <React.StrictMode>
    <JssProvider id={{ minify: process.env.NODE_ENV === 'production' }}>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </JssProvider>
  </React.StrictMode>
);
