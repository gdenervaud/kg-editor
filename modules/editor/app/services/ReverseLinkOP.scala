/*
 *   Copyright (c) 2018, EPFL/Human Brain Project PCO
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

package services

import constants.EditorConstants
import models.NexusPath
import models.instance.{EditorInstance, NexusInstance, NexusInstanceReference, NexusLink}
import models.specification.EditorFieldSpecification
import play.api.Logger
import play.api.libs.json.{JsArray, JsObject, JsValue, Json}

object ReverseLinkOP {
  type ReverseLinks = List[(EditorConstants.Command, EditorInstance, String)]
  val logger = Logger(this.getClass)

  def isRefInOriginalInstanceField(
    instance: NexusInstance,
    fieldKey: String,
    ref: NexusInstanceReference
  ): Boolean = {
    instance.content.value.get(fieldKey).isDefined &&
    instance.content
      .value(fieldKey)
      .asOpt[List[NexusLink]]
      .map(l => l.exists(el => el.ref == ref))
      .getOrElse(
        instance.content
          .value(fieldKey)
          .asOpt[NexusLink]
          .exists(_.ref == ref)
      )

  }

  def removeReverseLinksFromInstance(
    instance: EditorInstance,
    instanceFieldsSpecs: Map[String, EditorFieldSpecification]
  ): EditorInstance = instance.copy(
    nexusInstance = instance.nexusInstance.copy(
      content = Json
        .toJson(
          instance
            .contentToMap()
            .filterNot(
              k =>
                instanceFieldsSpecs(k._1).isReverse
                  .getOrElse(false)
            )
        )
        .as[JsObject]
    )
  )

  def handleUpdateOfReverseLink(
    baseUrl: String,
    reverseInstancefieldName: String,
    updateToBeStored: EditorInstance,
    updateReference: NexusInstanceReference,
    reverseInstance: NexusInstance,
    fieldKey: String,
    reverseInstanceReference: NexusInstanceReference,
    path: NexusPath
  ): EditorInstance = {
    val currentValue = reverseInstance.content.value.get(fieldKey)
    val content = generateReverseLinkContent(updateReference, currentValue)
    EditorInstance(
      NexusInstance(
        Some(reverseInstanceReference.id),
        path,
        Json.obj(
          reverseInstancefieldName -> Json.toJson(content.map(_.toJson(baseUrl)))
        )
      )
    )
  }

  /**
    *  Generate the list of link to update the reverse link instance
    * @param updateReference The reverse link instance reference
    * @param currentValue The current content of the reverse link instance
    * @return a list of nexus containing the new link
    */
  def generateReverseLinkContent(
    updateReference: NexusInstanceReference,
    currentValue: Option[JsValue]
  ): List[NexusLink] = {
    if (currentValue.isDefined && currentValue.get.asOpt[List[NexusLink]].isDefined) {
      (NexusLink(updateReference) :: currentValue.get.as[List[NexusLink]]).distinct
    } else if (currentValue.isDefined && currentValue.get.asOpt[NexusLink].isDefined &&
               currentValue.get.as[NexusLink].ref != updateReference) {
      val c = currentValue.get.as[NexusLink]
      List(NexusLink(updateReference), c)
    } else {
      List(NexusLink(updateReference))
    }
  }
}
