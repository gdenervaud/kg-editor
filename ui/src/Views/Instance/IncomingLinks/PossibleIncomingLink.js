/*
*   Copyright (c) 2021, EPFL/Human Brain Project PCO
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

import React from "react";
import { observer } from "mobx-react-lite";
import { createUseStyles } from "react-jss";
import Button from "react-bootstrap/Button";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import uniqueId from "lodash/uniqueId";

import { useStores } from "../../../Hooks/UseStores";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const useStyles = createUseStyles({
  btn: {
    padding: ".175rem .75rem",
    marginRight: "5px",
    color: "#212529",
    "&:hover": {
      backgroundColor: "transparent",
      borderColor: "#337ab7",
      color: "#212529"
    }
  }
});

const PossibleIncomingLink = observer(({ type, spaces }) => {

  const classes = useStyles();
  const { appStore, history, browseStore } = useStores();

  const handleLinkFrom = space => {
    if(appStore.currentWorkspace.id !== space) {
      appStore.setCurrentWorkspace(space);
    }
    history.push("/browse");
    browseStore.selectItem(type);
  };

  return(
    <React.Fragment>
      {spaces.map(space => (
        <OverlayTrigger key={`${space}-${type.label}`} placement="top" overlay={<Tooltip id={uniqueId("label-tooltip")}>{`In space ${space}`}</Tooltip>}>
          <Button className={classes.btn}  onClick={() => handleLinkFrom(space)} variant="outline-secondary">
            <FontAwesomeIcon icon={"circle"} color={type.color}/>&nbsp;&nbsp;<span>{type.label}</span>
          </Button>
        </OverlayTrigger>
      ))}
    </React.Fragment>
  );
});
PossibleIncomingLink.displayName = "PossibleIncomingLink";

export default PossibleIncomingLink;