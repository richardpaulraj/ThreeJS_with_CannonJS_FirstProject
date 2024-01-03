import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'

import * as CANNON from 'cannon-es'
// console.log(CANNON)

/**
 * Debug
 */
const gui = new GUI()

const debugObjects = {}

debugObjects.createSphere = ()=>{

    createSphere(
        Math.random() * 0.5,
        {
         x: (Math.random() - 0.5) * 3 ,
         y: 3,
         z: (Math.random() - 0.5) * 3 
        }
    )
}

debugObjects.addBox = ()=>{
    createBox(
        Math.random(),
        Math.random(),
        Math.random(),
        {
            x: (Math.random() - 0.5) * 3,
            y: 3,
            z: (Math.random() - 0.5) * 3
        }
    )
}

gui.add(debugObjects, 'addBox')
gui.add(debugObjects, 'createSphere')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

//Physics

//World
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world) //To improve Performance
world.allowSleep = true //Even this improves performance very well
world.gravity.set(0,-9.82,0)

//Material
const defaultMaterial = new CANNON.Material('default')

//Combination of a material 
const defaultContactMaterial =  new CANNON.ContactMaterial(
    defaultMaterial,defaultMaterial,{
        friction: 0.3,
        restitution: 0.7 //The bouncing value
    }
)
world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial // One liner to add the material for bouncing one

//Floor

const floorShape = new CANNON.Box(new CANNON.Vec3(10/2,10/2, 0.3 / 2)) //I am make this because the objects should fall after it reches the end I am diivng by 2 because here it starts from the center
const floorBody = new CANNON.Body({
    mass: 0, // Means this is Static it wont move
    shape : floorShape,
})
floorBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1,0,0) , Math.PI  / 2 //To change the rotaion to normal it can be donr only by using quaternion
) 

world.addBody(floorBody)



/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])



/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 0.3),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 2.1)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

//Utils
const objectsToUpdate= []

//Moving the goemtry and material outside to increase the performance
const sphereGeometry = new THREE.SphereGeometry(1,20,20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness : 0.3,
    roughness : 0.4,
    envMap : environmentMapTexture,
    emissiveIntensity : 0.5
})

const createSphere = (radius, position)=>{
    //Three Js Mesh
    const mesh = new THREE.Mesh(
        sphereGeometry, sphereMaterial
    )
    
    //Adding this because we added 1 as a vaule of a raius outside the function so to override it and keep it according to the radius we are doing like this because radius keeps on changing 
    mesh.scale.set(radius,radius,radius)

    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    //Cannon Js Body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0,3,0),
        shape: shape,
        material : defaultContactMaterial
    })
    body.position.copy(position)

    body.linearDamping = 0.31  // Here If you dont add it this sphere keeps on moving non stop when the other object touches it to avoid that we did this

    world.addBody(body)

    //Save the objects to update
    objectsToUpdate.push({
        mesh:mesh,
        body:body
    })

}

createSphere(0.5, {x:0, y: 3, z: 0})


//Creat Boxes
const boxGeometry = new THREE.BoxGeometry(1,1,1)
const boxMaterial = new THREE.MeshStandardMaterial({
    metalness : 0.3,
    roughness : 0.4,
    envMap : environmentMapTexture,
    // emissiveIntensity: 0.5
})

const createBox = (width, height, depth, position)=>{

   //Three JS Mesh
   const mesh = new THREE.Mesh(boxGeometry, boxMaterial)
   mesh.scale.set(width,height,depth)
   mesh.castShadow = true
   mesh.position.copy(position)
   scene.add(mesh)

   //Cannon Js Body
   const shape = new CANNON.Box(new CANNON.Vec3(width/2,height/2,depth/2)) //Because we are starting from the center of the box
   const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0,3,0),
    shape: shape,
    material : defaultContactMaterial
   })
   body.position.copy(position)
   world.addBody(body)

   //save in objects
   objectsToUpdate.push({mesh, body})
}
// createBox(1, 1, 1, {x: 0, y: 3, z: 0} )






/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0
const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // Update controls
    controls.update()

    //Update Physics World
    world.step(1/60,deltaTime,3)

    // sphere.position.copy(sphereBody.position)
    for(const object of objectsToUpdate){
        object.mesh.position.copy(object.body.position) //Because body's position id updated using the world.step above this code

        //For Rotation  of the Boxes in Three js because u cant use the rotation propety of the mesh u should use quaternion
        object.mesh.quaternion.copy(object.body.quaternion)

    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()