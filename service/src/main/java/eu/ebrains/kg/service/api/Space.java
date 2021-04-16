package eu.ebrains.kg.service.api;

import eu.ebrains.kg.service.controllers.SpaceController;
import eu.ebrains.kg.service.models.KGCoreResult;
import eu.ebrains.kg.service.models.space.StructureOfType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RequestMapping("/spaces")
@RestController
public class Space {

    private final SpaceController spaceController;

    public Space(SpaceController spaceController) {
        this.spaceController = spaceController;
    }

    @GetMapping("/{space}/types")
    public KGCoreResult<List<StructureOfType>> getSpaceTypes(@PathVariable("space") String space) {
        List<StructureOfType> spaceTypes = spaceController.getTypes(space);
        return new KGCoreResult<List<StructureOfType>>().setData(spaceTypes);
    }

}