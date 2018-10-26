
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
package editor.models.EditorUserList


case class UserFolder(folderName: String, folderType: FolderType, userLists: List[UserList] )

object UserFolder {

  import play.api.libs.json._
  import play.api.libs.functional.syntax._

  implicit val userFolderWrites: Writes[UserFolder] = (
    (JsPath \ "folderName").write[String] and
      JsPath.write[FolderType] and
      (JsPath \ "lists").write[List[UserList]]
    )(unlift(UserFolder.unapply))
}
