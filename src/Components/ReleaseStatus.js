import React from "react";
import injectStyles from "react-jss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const styles = {
  status:{
    borderRadius:"0.14em",
    width:"2.5em",
    background:"currentColor",
    textAlign:"center",
    color:"#337ab7",
    opacity:1,
    padding:"2px",
    lineHeight:"normal",
    "&.has-changed":{
      color:"#f39c12"
    },
    "&.not-released":{
      color:"#e74c3c"
    },
    display:"grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(50%, 1fr))",
    "&.darkmode $instanceStatus":{
      color:"var(--bg-color-ui-contrast2)",
    },
    "&.darkmode $childrenStatus":{
      background:"var(--bg-color-ui-contrast2)",
    }
  },

  instanceStatus:{
    color:"white",
    "& .svg-inline--fa":{
      fontSize:"0.7em",
      verticalAlign:"baseline"
    },
    "&:only-child":{
      "& .svg-inline--fa":{
        fontSize:"0.8em"
      },
    }
  },
  childrenStatus:{
    borderRadius:"0.07em",
    background:"white",
    "& .svg-inline--fa":{
      fontSize:"0.7em",
      verticalAlign:"baseline"
    },
  },
};

@injectStyles(styles)
export default class ReleaseStatus extends React.Component{
  render(){
    const {classes, instanceStatus, childrenStatus} = this.props;

    const globalStatusClass = (instanceStatus === "NOT_RELEASED" || childrenStatus === "NOT_RELEASED")? "not-released"
      :(instanceStatus === "HAS_CHANGED" || childrenStatus === "HAS_CHANGED")? "has-changed"
        :"released";

    const instanceStatusClass = (instanceStatus === "NOT_RELEASED")? "not-released"
      :(instanceStatus === "HAS_CHANGED")? "has-changed"
        :"released";

    const childrenStatusClass = (childrenStatus === "NOT_RELEASED")? "not-released"
      :(childrenStatus === "HAS_CHANGED")? "has-changed"
        :"released";

    return(
      <div className={`${classes.status} ${globalStatusClass} ${this.props.darkmode? "darkmode": ""}`}>
        <div className={`${classes.instanceStatus} ${instanceStatusClass}`}>
          {instanceStatus === "NOT_RELEASED"?
            <FontAwesomeIcon icon="unlink"/>
            :instanceStatus === "HAS_CHANGED"?
              <FontAwesomeIcon icon="pencil-alt"/>
              :instanceStatus === "RELEASED"?
                <FontAwesomeIcon icon="check"/>
                :
                <strong>?</strong>
          }
        </div>
        {childrenStatus !== null &&
          <div className={`${classes.childrenStatus} ${childrenStatusClass}`}>
            {childrenStatus === "NOT_RELEASED"?
              <FontAwesomeIcon icon="unlink"/>
              :childrenStatus === "HAS_CHANGED"?
                <FontAwesomeIcon icon="pencil-alt"/>
                :childrenStatus === "RELEASED"?
                  <FontAwesomeIcon icon="check"/>
                  :
                  <strong>?</strong>
            }
          </div>
        }
      </div>
    );
  }
}