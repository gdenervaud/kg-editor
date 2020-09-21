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

import { observable, action, computed, runInAction, set} from "mobx";

import API from "../Services/API";
import appStore from "./AppStore";

const typeDefaultColor = "white";
const typeDefaultName = "-";
const typeDefaultLabel = "Unknown";

const getGroupId = types => types.map(t => t.name).join("|");

const getGroupName = types => types.map(t => t.label).join(", ");

const getColor = types => types[0].color?types[0].color:typeDefaultColor;

const createGroup = (id, types) => ({
  id: id,
  name: getGroupName(types),
  color: getColor(types),
  isGroup: true,
  types: types,
  nodes: [],
  show: true,
  grouped: false,
  highlighted: false
});

const createNode = (id, name, color, groupId) => ({
  id: id,
  name: name?name:id,
  color: color,
  groupId: groupId,
  highlighted: false
});

const createLink = (id, source, target) => ({
  id: id,
  source: source,
  target: target,
  highlighted: false
});

const extractGroupsAndLinks = data => {
  const groups = {};
  const nodes = {};
  const links = {};

  const getOrCreateNode = (id, name, group) => {
    let node = nodes[id];
    if (!node) {
      node = createNode(id, name, group.color, group.id);
      nodes[id] = node;
      group.nodes.push(node);
      if (group.nodes.length > 1) { // by default we group nodes when more than one
        group.grouped = true;
      }
    }
    return node;
  };

  const getOrCreateGroup = types => {
    const groupId = getGroupId(types);
    let group = groups[groupId];
    if (!group) {
      group = createGroup(groupId, types);
      groups[groupId] = group;
    }
    return group;
  };

  const addDirectionalLink = (source, target) => {
    const id = `${source.id}->${target.id}`;
    if (!links[id]) {
      links[id] = createLink(id, source, target);
    }
  };

  const addLink = (source, target, isReverse) => {
    if (isReverse) {
      addDirectionalLink(target, source);
    } else {
      addDirectionalLink(source, target);
    }
  };

  const extractData = (data, parentNode, parentGroup, isReverse) => {
    const types = (data.types && data.types.length)?data.types:[{name: typeDefaultName, label: typeDefaultLabel}];
    const group = getOrCreateGroup(types);
    const node = getOrCreateNode(data.id, data.name, group);

    if (!parentNode) {
      node.isMainNode = true;
    }

    if (parentNode) {
      addLink(node, parentNode, isReverse);
      addLink(group, parentNode, isReverse);
    }
    if (parentGroup) {
      addLink(node, parentGroup, isReverse);
      addLink(group, parentGroup, isReverse);
    }

    Array.isArray(data.inbound) && data.inbound.forEach(child => extractData(child, node, group, true));
    Array.isArray(data.outbound) && data.outbound.forEach(child => extractData(child, node, group, false));
  };

  extractData(data, null, null, false);

  Object.values(groups).forEach(group => group.nodes = group.nodes.sort((a, b) => (a.name?a.name:a.id).localeCompare(b.name?b.name:b.id)));

  return {
    groups: groups,
    links: Object.values(links)
  };
};

const isNodeVisible = (groups, node) => {
  if(node.isGroup) {
    if (node.grouped) {
      return node.show;
    }
  } else {
    const group = groups[node.groupId];
    if (!group.grouped) {
      return group.show;
    }
  }
  return false;
};

const getGraphNodes = groups => Object.values(groups).reduce((acc, group) => {
  if (group.show) {
    if (group.grouped) {
      acc.push(group);
    } else {
      acc.push(...group.nodes);
    }
  }
  return acc;
}, []);

const getGraphLinks = (groups, links) => links.filter(link => isNodeVisible(groups, link.source) && isNodeVisible(groups, link.target));

class GraphStore {
  @observable isFetching = false;
  @observable isFetched = false;
  @observable fetchError = null;
  @observable mainId = null;
  @observable groups = {};
  @observable links = [];
  @observable highlightedNode = null;

  @computed
  get graphData() {
    return {
      nodes: getGraphNodes(this.groups),
      links: getGraphLinks(this.groups, this.links)
    };
  }

  @computed
  get groupsList() {
    return Object.values(this.groups).sort((a, b) => a.name.localeCompare(b.name));
  }

  @action
  async fetch(id) {
    this.fetchError = null;
    this.isFetched = false;
    this.isFetching = true;
    try {
      const { data } = await API.axios.get(API.endpoints.neighbors(id));
      runInAction(() => {
        this.mainId = id;
        const {groups, links} = extractGroupsAndLinks(data.data);
        this.groups = groups;
        this.links = links;
        this.isFetched = true;
        this.isFetching = false;
      });
    } catch (e) {
      runInAction(() => {
        this.fetchError = e.message ? e.message : e;
        this.isFetching = false;
      });
      appStore.captureSentryException(e);
    }
  }

  @action
  reset() {
    this.isFetched = false;
    this.isFetching = false;
    this.groups = {};
    this.links = [];
    this.mainId = null;
  }

  @action
  setHighlightNodeConnections(node, highlighted=false) {
    this.highlightedNode = highlighted?node:null;
    set(node, "highlighted", highlighted);
    this.links.forEach(link => {
      set(link.source, "highlighted", false);
      set(link.target, "highlighted", false);
      set(link, "highlighted", false);
    });
    if (highlighted) {
      this.links.forEach(link => {
        if (link.source.id === node.id || link.target.id === node.id) {
          set(link.source, "highlighted", true);
          set(link.target, "highlighted", true);
          set(link, "highlighted", true);
        }
      });
    }
  }

  @action
  setGroupVisibility(group, show=true) {
    set(group, "show", show);
  }

  @action
  setGrouping(group, grouped=true) {
    set(group, "grouped", grouped);
  }
}

export default new GraphStore();