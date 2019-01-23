import React from "react";
import { inject, observer } from "mobx-react";
import { get } from "mobx";
import { FormGroup, Glyphicon, MenuItem, Alert } from "react-bootstrap";
import { difference, isFunction, isString, uniq } from "lodash";
import InfiniteScroll from "react-infinite-scroller";

import FieldLabel from "hbp-quickfire/lib/Components/FieldLabel";

import injectStyles from "react-jss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const styles = {
  values:{
    height:"auto",
    paddingBottom:"3px",
    position:"relative",
    "& .btn":{
      marginRight:"3px",
      marginBottom:"3px"
    },
    "& :disabled":{
      pointerEvents:"none"
    },
    "& [readonly] .quickfire-remove":{
      pointerEvents:"none"
    },
    "&[readonly] .quickfire-user-input, &[disabled] .quickfire-user-input":{
      display:"none"
    }
  },
  valueDisplay:{
    display:"inline-block",
    maxWidth:"200px",
    overflow:"hidden",
    textOverflow:"ellipsis",
    whiteSpace:"nowrap",
    verticalAlign:"bottom"
  },
  remove:{
    fontSize:"0.8em",
    opacity:0.5,
    marginLeft:"3px",
    "&:hover":{
      opacity:1
    }
  },
  options:{
    width:"100%",
    maxHeight:"33vh",
    overflowY:"auto",
    "&.open":{
      display:"block"
    },
    position: "absolute",
    top: "100%",
    left: "0",
    zIndex: "1000",
    display: "none",
    float: "left",
    minWidth: "160px",
    padding: "5px 0",
    margin: "2px 0 0",
    fontSize: "14px",
    textAlign: "left",
    backgroundColor: "#fff",
    backgroundClip: "padding-box",
    border: "1px solid rgba(0,0,0,.15)",
    borderRadius: "4px",
    boxShadow: "0 6px 12px rgba(0,0,0,.175)",
    "& .dropdown-menu":{
      position:"static",
      display:"block",
      float:"none",
      width:"100%",
      background:"none",
      border:"none",
      boxShadow:"none",
      padding:0,
      margin:0
    }
  },
  userInput:{
    background:"transparent",
    border:"none",
    color:"currentColor",
    outline:"none",
    width:"200px",
    maxWidth:"33%",
    marginBottom:"3px"
  },
  topList:{
    bottom: "100%",
    top: "auto",
    margin: "0 0 2px",
    boxShadow: "none"
  },
  readMode:{
    "& .quickfire-label:after":{
      content: "':\\00a0'"
    },
    "& .quickfire-readmode-item:not(:last-child):after":{
      content: "',\\00a0'"
    }
  }
};

@inject("formStore")
@injectStyles(styles)
@observer
export default class DynamicDropdownField extends React.Component {
  //The only way to trigger an onChange event in React is to do the following
  //Basically changing the field value, bypassing the react setter and dispatching an "input"
  // event on a proper html input node
  //See for example the discussion here : https://stackoverflow.com/a/46012210/9429503
  triggerOnChange = () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set
      .call(this.hiddenInputRef, JSON.stringify(this.props.field.getValue(false)));
    var event = new Event("input", { bubbles: true });
    this.hiddenInputRef.dispatchEvent(event);
  }

  handleInputKeyStrokes = e => {
    let field = this.props.field;
    if(field.disabled || field.readOnly){
      return;
    }
    if(field.allowCustomValues && e.keyCode === 13 && field.value.length < field.max){
      //User pressed "Enter" while focus on input and we haven't reached the maximum values
      if(isFunction(this.props.onAddCustomValue)){
        this.props.onAddCustomValue(e.target.value.trim(), field, this.props.formStore);
      }
      field.setUserInput("");
    } else if(!e.target.value && field.value.length > 0 && e.keyCode === 8){
      // User pressed "Backspace" while focus on input, and input is empty, and values have been entered
      e.preventDefault();
      this.beforeRemoveValue(field.value[field.value.length-1]);
      this.triggerOnChange();
    } else if(e.keyCode === 40){
      e.preventDefault();
      let allOptions = this.optionsRef.querySelectorAll(".option");
      if(allOptions.length > 0){
        allOptions[0].focus();
      }
    } else if(e.keyCode === 38){
      e.preventDefault();
      let allOptions = this.optionsRef.querySelectorAll(".option");
      if(allOptions.length > 0){
        allOptions[allOptions.length-1].focus();
      }
    } else if(e.keyCode === 27) {
      //escape key -> we want to close the dropdown menu
      this.closeDropdown();
    }
  };

  handleChangeUserInput = e => {
    if(this.props.field.disabled || this.props.field.readOnly){
      return;
    }
    e.stopPropagation();
    this.props.field.setUserInput(e.target.value);
  }

  handleFocus = () => {
    if(this.props.field.disabled || this.props.field.readOnly){
      return;
    }
    this.props.field.fetchOptions(true);
    this.inputRef.focus();
    this.listenClickOutHandler();
    //this.forceUpdate();
  };

  closeDropdown(){
    this.wrapperRef = null;
    this.forceUpdate();
  }

  handleRemove(value, e){
    if(this.props.field.disabled || this.props.field.readOnly){
      return;
    }
    e.stopPropagation();
    this.beforeRemoveValue(value);
    this.triggerOnChange();
  }

  handleRemoveBackspace(value, e){
    if(this.props.field.disabled || this.props.field.readOnly){
      return;
    }
    //User pressed "Backspace" while focus on a value
    if(e.keyCode === 8){
      e.preventDefault();
      this.beforeRemoveValue(value);
      this.triggerOnChange();
      this.handleFocus();
    }
  }

  handleSelect(option, e){
    let field = this.props.field;
    if(field.disabled || field.readOnly){
      return;
    }
    if(!e || (e && (!e.keyCode || e.keyCode === 13))){
      //If this function call doesn't send an event (->React Bootstrap OnSelect callback)
      //Or if it comes from a keyboard event associated with the "Enter" key
      if(e){
        e.preventDefault();
      }
      if(field.value.length < field.max){
        //If we have not reached the maximum values
        if(isString(option)){
          if(field.allowCustomValues && isFunction(this.props.onAddCustomValue)){
            this.props.onAddCustomValue(option, field, this.props.formStore);
          }
        } else {
          this.beforeAddValue(option);
          this.triggerOnChange();
        }
        field.setUserInput("");
        this.handleFocus();
      }
    } else if(e && (e.keyCode === 38 || e.keyCode === 40)){
      //If it comes from a key board event associated with the "Up" or "Down" key
      e.preventDefault();
      let allOptions = this.optionsRef.querySelectorAll(".option");
      let currentIndex = Array.prototype.indexOf.call(allOptions, e.target);
      let nextIndex;
      if(e.keyCode === 40){
        nextIndex = currentIndex + 1 < allOptions.length? currentIndex + 1: 0;
      } else {
        nextIndex = currentIndex - 1 >= 0? currentIndex - 1: allOptions.length-1;
      }
      allOptions[nextIndex].focus();
    }
  }

  handleDrop(droppedVal, e){
    let field = this.props.field;
    if(field.disabled || field.readOnly){
      return;
    }
    e.preventDefault();
    field.removeValue(this.draggedValue);
    field.addValue(this.draggedValue, field.value.indexOf(droppedVal));
    if(this.props.field.closeDropdownAfterInteraction){
      this.wrapperRef = null;
    }
    this.triggerOnChange();
    this.handleFocus();
  }

  clickOutHandler = e => {
    if(!this.wrapperRef || !this.wrapperRef.contains(e.target)){
      this.unlistenClickOutHandler();
      this.props.field.setUserInput("");
    }
  };

  listenClickOutHandler(){
    window.addEventListener("mouseup", this.clickOutHandler, false);
    window.addEventListener("touchend", this.clickOutHandler, false);
    window.addEventListener("keyup", this.clickOutHandler, false);
  }

  unlistenClickOutHandler(){
    window.removeEventListener("mouseup", this.clickOutHandler, false);
    window.removeEventListener("touchend", this.clickOutHandler, false);
    window.removeEventListener("keyup", this.clickOutHandler, false);
  }

  componentWillUnmount(){
    this.unlistenClickOutHandler();
  }

  beforeAddValue(value){
    if(isFunction(this.props.onBeforeAddValue)){
      this.props.onBeforeAddValue(() => {this.props.field.addValue(value);}, this.props.field, value);
    } else {
      this.props.field.addValue(value);
    }
    if(this.props.field.closeDropdownAfterInteraction){
      this.wrapperRef = null;
    }
  }

  beforeRemoveValue(value){
    if(isFunction(this.props.onBeforeRemoveValue)){
      this.props.onBeforeRemoveValue(() => {this.props.field.removeValue(value);}, this.props.field, value);
    } else {
      this.props.field.removeValue(value);
    }
    if(this.props.field.closeDropdownAfterInteraction){
      this.wrapperRef = null;
    }
  }

  handleTagInteraction(interaction, value, event){
    if(isFunction(this.props[`onValue${interaction}`])){
      this.props[`onValue${interaction}`](this.props.field, value, event);
    } else if(interaction === "Focus"){
      event.stopPropagation();
      this.closeDropdown();
    }
  }

  handleLoadMoreOptions = () => {
    this.props.field.loadMoreOptions();
  }

  render() {
    if(this.props.formStore.readMode || this.props.field.readMode){
      return this.renderReadMode();
    }

    let { classes, formStore } = this.props;
    let { options, value: values, mappingLabel, listPosition, disabled, readOnly, max, allowCustomValues, validationErrors, validationState } = this.props.field;

    let dropdownOpen = (!disabled && !readOnly && values.length < max && this.wrapperRef && this.wrapperRef.contains(document.activeElement));
    let dropdownClass = dropdownOpen? "open": "";
    dropdownClass += listPosition === "top" ? " "+classes.topList: "";

    let filteredOptions = [];
    if(dropdownOpen){
      filteredOptions = difference(options, values);
      filteredOptions = uniq(filteredOptions);
    }

    return (
      <div ref={ref=>this.wrapperRef = ref}>
        <FormGroup
          onClick={this.handleFocus}
          className={`quickfire-field-dropdown-select ${!values.length? "quickfire-empty-field": ""}  ${disabled? "quickfire-field-disabled": ""} ${readOnly? "quickfire-field-readonly": ""}`}
          validationState={validationState}>
          <FieldLabel field={this.props.field}/>
          <div disabled={disabled} readOnly={readOnly} className={`form-control ${classes.values}`}>
            {values.map(value => {
              return(
                <div key={formStore.getGeneratedKey(value, "quickfire-dropdown-item-button")}
                  tabIndex={"0"}
                  className={`value-tag quickfire-value-tag btn btn-xs btn-default ${disabled||readOnly? "disabled": ""}`}
                  disabled={disabled}
                  readOnly={readOnly}
                  draggable={true}
                  onDragEnd={()=>this.draggedValue = null}
                  onDragStart={()=>this.draggedValue = value}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={this.handleDrop.bind(this, value)}
                  onKeyDown={this.handleRemoveBackspace.bind(this, value)}

                  onClick={this.handleTagInteraction.bind(this, "Click", value)}
                  onFocus={this.handleTagInteraction.bind(this, "Focus", value)}
                  onBlur={this.handleTagInteraction.bind(this, "Blur", value)}
                  onMouseOver={this.handleTagInteraction.bind(this, "MouseOver", value)}
                  onMouseOut={this.handleTagInteraction.bind(this, "MouseOut", value)}
                  onMouseEnter={this.handleTagInteraction.bind(this, "MouseEnter", value)}
                  onMouseLeave={this.handleTagInteraction.bind(this, "MouseLeave", value)}

                  title={get(value, mappingLabel)}>
                  <span className={classes.valueDisplay}>
                    {isFunction(this.props.valueLabelRendering)?
                      this.props.valueLabelRendering(this.props.field, value):
                      get(value, mappingLabel)}
                  </span>
                  <Glyphicon className={`${classes.remove} quickfire-remove`} glyph="remove" onClick={this.handleRemove.bind(this, value)}/>
                </div>
              );
            })}

            <input className={`quickfire-user-input ${classes.userInput}`}
              onDrop={this.handleDrop.bind(this, null)}
              onDragOver={e=>e.preventDefault()}
              ref={ref=>this.inputRef=ref} type="text"
              onKeyDown={this.handleInputKeyStrokes}
              onChange={this.handleChangeUserInput}
              onFocus={this.handleFocus}
              value={this.props.field.userInput}
              disabled={readOnly || disabled || values.length >= max}/>

            <input style={{display:"none"}} type="text" ref={ref=>this.hiddenInputRef = ref}/>

            {dropdownOpen && (filteredOptions.length || this.props.field.userInput)?
              <div className={`quickfire-dropdown ${classes.options} ${dropdownClass}`} ref={ref=>{this.optionsRef = ref;}}>
                <InfiniteScroll
                  element={"ul"}
                  className={"dropdown-menu"}
                  threshold={100}
                  hasMore={this.props.field.hasMoreOptions()}
                  loadMore={this.handleLoadMoreOptions}
                  useWindow={false}>
                  {!allowCustomValues && this.props.field.userInput && filteredOptions.length === 0?
                    <MenuItem key={"no-options"} className={"quickfire-dropdown-item"}>
                      <em>No options available for: </em> <strong>{this.props.field.userInput}</strong>
                    </MenuItem>
                    :null}

                  {allowCustomValues && this.props.field.userInput?
                    <MenuItem className={"quickfire-dropdown-item"} key={this.props.field.userInput} onSelect={this.handleSelect.bind(this, this.props.field.userInput)}>
                      <div tabIndex={-1} className={"option"} onKeyDown={this.handleSelect.bind(this, this.props.field.userInput)}>
                        <em>Add a value: </em> <strong>{this.props.field.userInput}</strong>
                      </div>
                    </MenuItem>
                    :null}
                  {filteredOptions.map(option => {
                    return(
                      <MenuItem className={"quickfire-dropdown-item"} key={formStore.getGeneratedKey(option, "quickfire-dropdown-list-item")} onSelect={this.handleSelect.bind(this, option)}>
                        <div tabIndex={-1} className={"option"} onKeyDown={this.handleSelect.bind(this, option)}>
                          {option[mappingLabel]}
                        </div>
                      </MenuItem>
                    );
                  })}
                  {this.props.field.fetchingOptions?
                    <MenuItem className={"quickfire-dropdown-item quickfire-dropdown-item-loading"} key={"loading options"}>
                      <div tabIndex={-1} className={"option"}>
                        <FontAwesomeIcon spin icon="circle-notch"/>
                      </div>
                    </MenuItem>
                    :null}
                </InfiniteScroll>
              </div>
              :null}
          </div>
          {validationErrors && <Alert bsStyle="danger">
            {validationErrors.map(error => <p key={error}>{error}</p>)}
          </Alert>}
        </FormGroup>
      </div>
    );
  }

  renderReadMode(){
    let {
      value,
      mappingLabel,
      disabled,
      readOnly
    } = this.props.field;

    const {classes} = this.props;

    return (
      <div className={`quickfire-field-dropdown-select ${!value.length? "quickfire-empty-field":""} quickfire-readmode ${classes.readMode}  ${disabled? "quickfire-field-disabled": ""} ${readOnly? "quickfire-field-readonly": ""}`}>
        <FieldLabel field={this.props.field}/>
        {isFunction(this.props.readModeRendering)?
          this.props.readModeRendering(this.props.field)
          :
          <span className={"quickfire-readmode-list"}>
            {value.map(value => {
              return (
                <span key={this.props.formStore.getGeneratedKey(value, "dropdown-read-item")} className={"quickfire-readmode-item"}>
                  {isFunction(this.props.valueLabelRendering)?
                    this.props.valueLabelRendering(this.props.field, value):
                    get(value, mappingLabel)}
                </span>
              );
            })}
          </span>
        }
        <input style={{display:"none"}} type="text" ref={ref=>this.hiddenInputRef = ref}/>
      </div>
    );
  }
}