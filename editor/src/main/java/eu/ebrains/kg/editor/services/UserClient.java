package eu.ebrains.kg.editor.services;

import eu.ebrains.kg.editor.models.KGCoreResult;
import eu.ebrains.kg.editor.models.user.UserProfile;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;

import javax.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class UserClient extends AbstractServiceClient{

    public UserClient(HttpServletRequest request) {
        super(request);
    }

    private static class UserFromKG extends KGCoreResult<UserProfile>{}

    public UserProfile getUserProfile() {
        String uri = "users/me";
        UserFromKG response = get(uri)
                .retrieve()
                .bodyToMono(UserFromKG.class)
                .block();
        return response != null ? response.getData() : null;
    }

    private static class UserPictureMap extends HashMap<String, String> {}

    public Map<String, String> getUserPictures(List<String> userIds){
        String uri = "users/pictures";
        return post(uri).body(BodyInserters.fromValue(userIds)).retrieve().bodyToMono(UserPictureMap.class).block();
    }

}