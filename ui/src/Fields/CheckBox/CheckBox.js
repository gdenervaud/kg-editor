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
import { observer } from "mobx-react";
import injectStyles from "react-jss";
import { ControlLabel, FormGroup, Checkbox } from "react-bootstrap";

const styles = {
  readMode: {
    "& .quickfire-label:after": {
      content: "':\\00a0'"
    }
  }
};

@injectStyles(styles)
@observer
class CheckBox extends React.Component {

  handleChange = () => {
    const { fieldStore } = this.props;
    if (!fieldStore.disabled && !fieldStore.readOnly) {
      fieldStore.toggleValue();
    }
  };

  render() {
    const { fieldStore, readMode } = this.props;
    const { value, label } = fieldStore;

    if (readMode) {
      return this.renderReadMode();
    }

    return (
      <FormGroup className="quickfire-field-checkbox" >
        <ControlLabel className="quickfire-label">{label}</ControlLabel>
        <Checkbox readOnly={false} onChange={this.handleChange} checked={value} />
      </FormGroup>
    );
  }

  renderReadMode() {
    const { fieldStore, classes } = this.props;
    const { value, label } = fieldStore;

    return (
      <div className={`quickfire-field-checkbox quickfire-readmode ${classes.readMode} quickfire-field-readonly`}>
        <ControlLabel className={"quickfire-label"}>{label}</ControlLabel>
        <span>&nbsp;<input className={"quickfire-readmode-checkbox"} type="checkbox" readOnly={true} checked={value} /></span>
      </div>
    );
  }
}

export default CheckBox;