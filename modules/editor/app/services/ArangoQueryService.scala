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

import com.google.inject.Inject
import constants.{JsonLDConstants, SchemaFieldsConstants, UiConstants}
import helpers.InstanceHelper
import models.errors.APIEditorError
import models.instance.NexusInstance
import models.{EditorResponseObject, EditorResponseWithCount, NexusPath}
import play.api.http.HeaderNames._
import play.api.http.Status._
import play.api.libs.json._
import play.api.libs.ws.{WSClient, WSResponse}
import services.specification.FormService

import scala.concurrent.{ExecutionContext, Future}

class ArangoQueryService @Inject()(
  config: ConfigurationService,
  wSClient: WSClient,
  nexusService: NexusService,
  oIDCAuthService: OIDCAuthService,
  formService: FormService
)(implicit executionContext: ExecutionContext) {

  private def paginationParams(from: Option[Int], size: Option[Int]): List[(String, String)] = (from, size) match {
    case (Some(f), Some(s)) => List(("from", f.toString), ("size", s.toString))
    case (Some(f), _)       => List(("from", f.toString))
    case (_, Some(s))       => List(("size", s.toString))
    case _                  => List()
  }

//  def listInstances(
//    nexusPath: NexusPath,
//    from: Option[Int],
//    size: Option[Int],
//    search: String,
//    token: String
//  ): Future[Either[APIEditorError, EditorResponseWithCount]] = {
//    val parameters = paginationParams(from, size)
//    wSClient
//      .url(s"${config.kgQueryEndpoint}/arango/instances/${nexusPath.toString()}")
//      .withHttpHeaders(AUTHORIZATION -> token)
//      .withQueryStringParameters(("search", search) :: parameters: _*)
//      .get()
//      .map { res =>
//        res.status match {
//          case OK =>
//            val total = if ((res.json \ "fullCount").as[Long] == 0) {
//              (res.json \ "count").as[Long]
//            } else {
//              (res.json \ "fullCount").as[Long]
//            }
//            val data = (res.json \ "data").as[JsArray]
//            if (data.value.nonEmpty) {
//              val dataType = if ((data.value.head \ JsonLDConstants.TYPE).asOpt[List[String]].isDefined) {
//                (data.value.head \ JsonLDConstants.TYPE).as[List[String]].head
//              } else {
//                (data.value.head \ JsonLDConstants.TYPE).asOpt[String].getOrElse("")
//              }
//              val result = EditorResponseWithCount(
//                Json.toJson(InstanceHelper.formatInstanceList(data, dataType, formService.formRegistry)),
//                dataType,
//                formService.formRegistry.registry.get(nexusPath).map(_.label).getOrElse(nexusPath.toString()),
//                total
//              )
//              Right(
//                result
//              )
//
//            } else {
//              Right(
//                EditorResponseWithCount.empty
//              )
//            }
//          case _ => Left(APIEditorError(res.status, res.body))
//        }
//      }
//  }

}
