import React from "react";
import injectStyles from "react-jss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PopOverButton from "./PopOverButton";
import { SingleField } from "hbp-quickfire";

const styles = {
  button: {
    textAlign:"center",
    lineHeight:"normal",
    opacity:1,
    "& .icon": {
      color: "transparent",
      stroke: "var(--bookmark-off-color)",
      strokeWidth: "4em",
      fontSize:"1em",
      verticalAlign:"baseline"
    },
    "& .icon.is-bookmark": {
      color: "var(--bookmark-on-color)",
      strokeWidth: 0
    },
    "&:hover .icon, &:active .icon": {
      color: "var(--bookmark-off-color-highlight)",
      strokeWidth: 0
    },
    "&:hover .icon.is-bookmark, &:active .icon.is-bookmark": {
      color: "var(--bookmark-on-color-highlight)",
      strokeWidth: 0
    }
  }
};

@injectStyles(styles)
class BookmarkButton extends React.Component {
  constructor (props) {
    super(props);
    this.state = { listPosition: "bottom" };
  }

  changeBookmarkListPosition(position) {
    this.setState({listPosition: position?position:"bottom" });
  }

  handleValueChange(event, field) {
    const bookmarkLists = field.value.map(bookmarkList => bookmarkList.id);
    typeof this.props.onChange === "function" && this.props.onChange(bookmarkLists);
  }

  handleNew(name) { // , field, store) {
    typeof this.props.onNew === "function" && this.props.onNew(name);
  }

  render() {
    const {classes, className, values, list, onSave} = this.props;
    const isBookmark = values && values.length;
    return (
      <PopOverButton
        className={className}
        buttonClassName={classes.button}
        iconComponent={FontAwesomeIcon}
        iconProps={{icon: "star", className: `icon ${isBookmark?"is-bookmark":""}`}}
        onClose={onSave}
        onPositionChange={this.changeBookmarkListPosition.bind(this)}
      >
        <SingleField key={JSON.stringify(values)} type="DropdownSelect" label="Bookmarks:" value={values} options={list} mappingValue="id" mappingLabel="label" listPosition={this.state.listPosition?this.state.listPosition:"bottom"} allowCustomValues={true} onChange={this.handleValueChange.bind(this)} onAddCustomValue={this.handleNew.bind(this)} />
      </PopOverButton>
    );
  }
}

export default BookmarkButton;