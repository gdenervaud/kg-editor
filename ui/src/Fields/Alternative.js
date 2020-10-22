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

import React from "react";
import { createUseStyles } from "react-jss";
import { Dropdown } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import User from "../Components/User";
import authStore from "../Stores/AuthStore";

const useStyles = createUseStyles({
  container: {
    "& .option em .user + .user:before": {
      content: "'; '"
    },
    "& .option": {
      position: "relative",
      paddingLeft: "3px",
    },
    "& .option .parenthesis": {
      display: "inline-block",
      transform: "scaleY(1.4)"
    },
    "& .selected": {
      position: "absolute",
      top: "50%",
      left: "-15px",
      transform: "translateY(-50%)"
    }
  },
  removeIcon: {
    marginLeft: "3%"
  }
});

const Alternative = ({ alternative, ValueRenderer, className, onSelect, onRemove }) => {

  const classes = useStyles();

  const handleSelect = e => {
    typeof onSelect === "function" && onSelect(alternative, e);
  };

  const handleRemoveClick = e => {
    e.stopPropagation();
    typeof onRemove === "function" && onRemove(e);
  };

  const users = (!alternative || !alternative.users)?[]:alternative.users;
  const isOwnAlternative = users.find(user => authStore.user.id === user.id);

  return (
    <Dropdown.Item className={`quickfire-dropdown-item ${classes.container}`} onSelect={handleSelect}>
      <div tabIndex={-1} className={`option ${className?className:""}`} onKeyDown={handleSelect}>
        <strong>
          <ValueRenderer value={alternative.value} /></strong> <em><div className="parenthesis">(</div>{
          users.map(user => (
            <User userId={user.id} name={user.name} key={user.id} picture={user.picture} />
          ))
        }<div className="parenthesis">)</div></em>
        {alternative.selected?
          <FontAwesomeIcon icon="check" className="selected" />
          :null
        }
        {isOwnAlternative && (
          <span className={classes.removeIcon}><FontAwesomeIcon onClick={handleRemoveClick} icon="times" /></span>
        )}
      </div>
    </Dropdown.Item>
  );
};

export default Alternative;