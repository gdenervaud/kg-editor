package eu.ebrains.kg.editor.services;

import eu.ebrains.kg.editor.constants.CustomHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Component
public class WorkspaceClient {
    private final WebClient webClient = WebClient.builder().build();

    @Value("${kgcore.endpoint}")
    String kgCoreEndpoint;

    @Value("${kgcore.apiVersion}")
    String apiVersion;

    public Map getWorkspaces(String token, String clientToken) {
        String uri = String.format("%s/%s/spaces?stage=IN_PROGRESS&permissions=true", kgCoreEndpoint, apiVersion);
        return webClient.get()
                .uri(uri)
                .headers(h -> {
                    h.add(HttpHeaders.AUTHORIZATION, token);
                    h.add(CustomHeaders.CLIENT_AUTHORIZATION, clientToken);
                })
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    public Map getWorkspaceTypes(String workspace, String token, String clientToken) {
        String uri = String.format("%s/%s/types?stage=IN_PROGRESS&space=%s&withProperties=true", kgCoreEndpoint, apiVersion, workspace);
        return webClient.get()
                .uri(uri)
                .headers(h -> {
                    h.add(HttpHeaders.AUTHORIZATION, token);
                    h.add(CustomHeaders.CLIENT_AUTHORIZATION, clientToken);
                })
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    public Map getTypesByName(List<String> types, boolean withProperties, String token, String clientToken) {
        String uri = String.format("%s/%s/typesByName?stage=IN_PROGRESS&withProperties=%s", kgCoreEndpoint, apiVersion, withProperties);
        return webClient.post()
                .uri(uri)
                .headers(h -> {
                    h.add(HttpHeaders.AUTHORIZATION, token);
                    h.add(CustomHeaders.CLIENT_AUTHORIZATION, clientToken);
                })
                .body(BodyInserters.fromValue(types))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

}
