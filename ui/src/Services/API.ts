/*  Copyright 2018 - 2021 Swiss Federal Institute of Technology Lausanne (EPFL)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0.
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *  This open source software code was developed in part or in whole in the
 *  Human Brain Project, funded from the European Union's Horizon 2020
 *  Framework Programme for Research and Innovation under
 *  Specific Grant Agreements No. 720270, No. 785907, and No. 945539
 *  (Human Brain Project SGA1, SGA2 and SGA3).
 *
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
 *
 */
import { Settings, UserProfile, KGCoreResult, UUID, Stage } from "../types";

export default interface API {

  getSettings(): Promise<Settings>;

  getUserProfile(): Promise<UserProfile>;

  getSpaceTypes(space: string): Promise<void>;

  getInstance(instanceId: UUID): Promise<void>;

  getRawInstance(instanceId: UUID): Promise<void>;

  deleteInstance(instanceId: UUID): Promise<void>;

  createInstance(space: string, instanceId: UUID, payload): Promise<void>;

  moveInstance(instanceId: UUID, space: string): Promise<void>;

  patchInstance(instanceId: UUID, payload: object): Promise<void>;

  searchInstancesByType(space: string, type: string, from: number, size: number, search: string): Promise<void>;

  getSuggestions(instanceId: UUID, field: string, sourceType: string, targetType: string, from: number, size: number, search: string, payload: object): Promise<void>;

  getInstanceNeighbors(instanceId: UUID): Promise<void>;

  getInstanceScope(instanceId: UUID): Promise<void>;

  getInstancesLabel(stage: Stage, instanceIds: UUID[]): Promise<void>;

  getInstancesSummary(stage: Stage, instanceIds: UUID[]): Promise<void>;

  getInstancesList(stage: Stage, instanceIds: UUID[]): Promise<void>;

  getInvitedUsers(instanceId: UUID): Promise<void>;

  getUsersForReview(search: string): Promise<void>;

  inviteUser(instanceId: UUID, userId: UUID): Promise<void>;

  removeUserInvitation(instanceId: UUID, userId: UUID): Promise<void>;

  getMessages(): Promise<void>;

  releaseInstance(instanceId: UUID): Promise<void>;

  unreleaseInstance(instanceId: UUID): Promise<void>;

  getReleaseStatusTopInstance(instanceIds: UUID[]): Promise<void>;

  getReleaseStatusChildren(instanceIds: UUID[]): Promise<void>;

  getFeatures(): Promise<void>;

  getMoreIncomingLinks(instanceId: UUID, property: string, type: string, from: number, size: number): Promise<void>;
}