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

import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import { createUseStyles } from "react-jss";
import Form from "react-bootstrap/Form";

import Alternatives from "../Alternatives";
import Label from "../Label";
import Invalid from "../Invalid";

const useStyles = createUseStyles({
  alternatives: {
    marginLeft: "3px"
  },
  label: {},
  readMode:{
    "& $label:after": {
      content: "':\\00a0'"
    }
  },
  warning: {
    borderColor: "var(--ft-color-warn)"
  }
});

const getStringValue = value => !value || typeof value === "string"? value:JSON.stringify(value);

const getDateValue = value => {
  if (value && typeof value === "string") {
    const d = new Date(value);
    if (d instanceof Date && !isNaN(d)) {
      return d.toLocaleDateString();
    }
    return value
  }
  return JSON.stringify(value);
}

const Lines = ({lines}) => {
  return (
    <div>
      {lines.map((line, index) => {
        return(
          <p key={line+(""+index)}>{line}</p>
        );
      })}
    </div>
  );
};

const FieldValue = ({field, splitLines}) => {
  const { value } = field;

  if (splitLines) {
    const lines = typeof value === "string"?value.split("\n"):[];
    return (
      <Lines lines={lines} />
    );
  }

  const val = (field.inputType === "date")?getDateValue(value):getStringValue(value);

  return (
    <span>&nbsp;{val}</span>
  );
};

const AlternativeValue = observer(({alternative}) => typeof alternative.value === "string"?alternative.value:JSON.stringify(alternative.value));
AlternativeValue.displayName = "AlternativeValue";

const AlternativeDateValue = observer(({alternative}) => getDateValue(alternative.value));
AlternativeDateValue.displayName = "AlternativeDateValue";

const InputText = observer(({ fieldStore, className, as, readMode, showIfNoValue }) => {

  const classes = useStyles();

  const formGroupRef = useRef();

  const {
    value,
    inputType,
    rows,
    returnAsNull,
    alternatives,
    label,
    labelTooltip,
    labelTooltipIcon,
    globalLabelTooltip,
    globalLabelTooltipIcon,
    isRequired
  } = fieldStore;

  const handleChange = e => fieldStore.setValue(e.target.value);

  const handleSelectAlternative = value => fieldStore.setValue(value);

  const handleRemoveMySuggestion = () => fieldStore.setValue(null);

  if(readMode){
    if(!value && !showIfNoValue) {
      return null;
    }
    return (
      <Form.Group className={`${classes.readMode} ${className}`}>
        <Label className={classes.label} label={label} />
        <FieldValue field={fieldStore} splitLines={as === "textarea"} />
      </Form.Group>
    );
  }

  const AlternativeValueComponent = inputType === "date"?AlternativeDateValue:AlternativeValue;

  const isDisabled = returnAsNull;
  const hasWarning = !isDisabled && fieldStore.hasChanged && (fieldStore.requiredValidationWarning || fieldStore.maxLengthWarning || fieldStore.regexWarning);
  const warningMessages = fieldStore.warningMessages;
  const hasWarningMessages = fieldStore.hasWarningMessages;
  return (
    <Form.Group className={className} ref={formGroupRef} >
      <Label className={classes.label} label={label} labelTooltip={labelTooltip} labelTooltipIcon={labelTooltipIcon} isRequired={isRequired} globalLabelTooltip={globalLabelTooltip} globalLabelTooltipIcon={globalLabelTooltipIcon}/>
      <Alternatives
        className={classes.alternatives}
        list={alternatives}
        onSelect={handleSelectAlternative}
        onRemove={handleRemoveMySuggestion}
        parentContainerRef={formGroupRef}
        ValueRenderer={AlternativeValueComponent}
      />
      <Form.Control
        value={value}
        type={inputType}
        as={as}
        onChange={handleChange}
        disabled={isDisabled}
        rows={rows}
        className={hasWarning && hasWarningMessages?classes.warning:""}
      />
      {hasWarning && hasWarningMessages &&
        <Invalid  messages={warningMessages}/>
      }
    </Form.Group>
  );
});
InputText.displayName = "InputText";

export default InputText;