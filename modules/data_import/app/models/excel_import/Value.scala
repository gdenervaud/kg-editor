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
package models.excel_import

import nexus.services.NexusService
import play.api.libs.json._
import scala.collection.immutable.HashSet
import scala.concurrent.{ExecutionContext, Future}
import Entity.isNexusLink
import Value._


sealed trait Value {
  def toJson(): JsValue
  def toJsonLd(): JsValue
  def addValue(value: String, unit: Option[String] = None): Value
  def toStringSeq(): Seq[(String, String, String)]
  def getNonEmtpy(): Option[Value]
  def resolveValue(linkRef: collection.mutable.Map[String, String]): Value
  def needsValidation(): Boolean = true
  def checkInternalLinksValidity(dataRef: HashSet[String]): Value
  def validateValue(token: String, nexusService: NexusService)
                   (implicit executionContext: ExecutionContext): Future[Value]
}

case class SingleValue(value: String, unit: Option[String] = None, status: Option[String] = None) extends Value{

  override def checkInternalLinksValidity(linksRef: HashSet[String]): SingleValue = {
    val newStatus = if (isNexusLink(value)) {
      DEFAULT_RESOLUTION_STATUS
    } else if (linksRef.contains(value)) FOUND else NOT_FOUND
    this.copy(status = Some(newStatus))
  }

  override def needsValidation(): Boolean = {
    // if value has a status already validation is not needed
    status == None
  }

  override def toJson(): JsValue = {
    JsObject(Map(
      "value" -> JsString(value),
      "unit" -> JsString(unit.getOrElse(DEFAULT_UNIT)),
      "resolution status" -> JsString(status.getOrElse(DEFAULT_RESOLUTION_STATUS))
    ))
  }

  /* build object with id only if it's a nexus link */
  override def toJsonLd(): JsValue = {
    status match {
      case Some(NOT_FOUND) => JsNull
      case _ if isNexusLink(value) => JsObject(Map("@id" -> JsString(value)))
      case _ =>
        val unitString = unit.map( u => s" ${u}").getOrElse(DEFAULT_UNIT)
        JsString(s"$value${unitString}")
    }
  }

  override def addValue(newValue: String, unit: Option[String] = None): Value = {
    ArrayValue(Seq(this, SingleValue(newValue, unit)))
  }

  override def toStringSeq(): Seq[(String, String, String)] = {
    Seq((value, unit.getOrElse(DEFAULT_UNIT), status.getOrElse(DEFAULT_RESOLUTION_STATUS)))
  }

  override def getNonEmtpy(): Option[SingleValue] = {
    if (value.trim.isEmpty) None else Some(this.copy(value = value.trim))
  }

  override def resolveValue(linksRef: collection.mutable.Map[String, String]): SingleValue = {
    if (isNexusLink(value)){
      this
    } else {
      linksRef.get(value) match {
        case Some(foundLink) =>
          this.copy(value = foundLink, status = Some(FOUND))
        case None =>
          this.copy(status = Some(NOT_FOUND))
      }
    }
  }

  override def validateValue(token: String, nexusService: NexusService)
                            (implicit ec: ExecutionContext): Future[SingleValue] = {
    if (Entity.isNexusLink(value) && needsValidation()){
      // check validity only if needed
      nexusService.getInstance(value,token).map(
        _.status match {
        case 200 =>
          this.copy(status = Some(VALID))
        case _ =>
          this.copy(status = Some(INVALID))
      })
    } else {
      Future.successful(this)
    }
  }
}


case class ArrayValue(values: Seq[SingleValue]) extends Value{

  override def checkInternalLinksValidity(dataRef: HashSet[String]): ArrayValue = {
    val newValues = values.map(_.checkInternalLinksValidity(dataRef))
    this.copy(values = newValues)
  }

  override def toJson(): JsValue = {
    JsArray(values.map(_.toJson))
  }

  override def toJsonLd(): JsValue = {
    val jsonValues = values.map(_.toJsonLd()).filterNot(_ == JsNull)
    if (jsonValues.isEmpty) JsNull else JsArray(jsonValues)
  }
  override def addValue(newValue: String, unit: Option[String] = None): Value = {
    ArrayValue(values :+ SingleValue(newValue, unit))
  }

  override def toStringSeq(): Seq[(String, String, String)] = values.flatMap(_.toStringSeq())

  override def getNonEmtpy(): Option[Value] = {
    val nonEmptyValues = values.flatMap(_.getNonEmtpy())
    nonEmptyValues match {
      case Seq() => None
      case head +: Seq() => Some(nonEmptyValues.head)
      case head +: tail => Some(ArrayValue(nonEmptyValues))
    }
  }

  override def resolveValue(linksRef: collection.mutable.Map[String, String]): ArrayValue = {
    val newValues = values.map{
      value => value.resolveValue(linksRef)
    }
    this.copy(values = newValues)
  }

  override def validateValue(token: String, nexusService: NexusService)
                            (implicit executionContext: ExecutionContext): Future[ArrayValue] = {
    val newValues = values.foldLeft(Future.successful(Seq.empty[SingleValue])){
      case (valuesFut, value) =>
        valuesFut.flatMap(
          values =>
            value.validateValue(token, nexusService).map(values :+ _)
        )
    }
    newValues.map(singleValues => this.copy(values = singleValues))
  }
}

object Value {
  val DEFAULT_UNIT = ""
  val RESOLVED = "RESOLVED"
  val FOUND = "FOUND"
  val NOT_FOUND = "NOT FOUND"
  val VALID = "VALID"
  val INVALID = "INVALID LINK"
  val DEFAULT_RESOLUTION_STATUS = "-"
}
